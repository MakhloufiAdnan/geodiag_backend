import userRepository from '../repositories/userRepository.js';
import licenseRepository from '../repositories/licenseRepository.js';
import refreshTokenRepository from '../repositories/refreshTokenRepository.js';
import {
  generateAccessToken,
  generateRefreshToken,
} from '../utils/jwtUtils.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserDto } from '../dtos/userDto.js';
import {
  UnauthorizedException,
  ForbiddenException,
} from '../exceptions/ApiException.js';

/**
 * @file Gère la logique métier complexe de l'authentification, y compris la
 * stratégie de rotation des jetons de rafraîchissement avec détection de réutilisation.
 * @class AuthService
 */
class AuthService {
  /**
   * Authentifie un utilisateur sur la base de son email et mot de passe.
   * @private
   * @param {string} email - L'email de l'utilisateur.
   * @param {string} password - Le mot de passe en clair.
   * @returns {Promise<object>} L'objet utilisateur complet depuis la BDD.
   * @throws {UnauthorizedException} Si l'authentification échoue.
   */
  async #authenticateUser(email, password) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Identifiants invalides.');
    }
    return user;
  }

  /**
   * Gère la connexion d'un administrateur de compagnie.
   * @param {string} email - L'email de l'admin.
   * @param {string} password - Le mot de passe de l'admin.
   * @returns {Promise<{user: UserDto, accessToken: string, refreshToken: string}>} L'utilisateur, l'accessToken et le refreshToken.
   */
  async loginCompanyAdmin(email, password) {
    const user = await this.#authenticateUser(email, password);

    if (user.role !== 'admin') {
      throw new ForbiddenException('Accès refusé. Rôle administrateur requis.');
    }

    const familyId = uuidv4();
    const accessToken = generateAccessToken({
      userId: user.user_id,
      role: user.role,
    });
    const refreshToken = generateRefreshToken({
      userId: user.user_id,
      familyId,
    });
    const decodedRefreshToken = jwt.decode(refreshToken);
    const expiresAt = new Date(decodedRefreshToken.exp * 1000);

    await refreshTokenRepository.create(
      user.user_id,
      refreshToken,
      familyId,
      expiresAt
    );

    return {
      user: new UserDto(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Gère la connexion d'un technicien, en vérifiant la validité de la licence de sa compagnie.
   * @param {string} email - L'email du technicien.
   * @param {string} password - Le mot de passe du technicien.
   * @returns {Promise<{user: UserDto, accessToken: string, refreshToken: string}>} L'utilisateur, l'accessToken et le refreshToken.
   */
  async loginTechnician(email, password) {
    const user = await this.#authenticateUser(email, password);

    if (user.role !== 'technician') {
      throw new ForbiddenException('Accès refusé. Rôle technicien requis.');
    }

    const license = await licenseRepository.findActiveByCompanyId(
      user.company_id
    );
    if (!license) {
      throw new ForbiddenException(
        'La licence de votre entreprise est inactive ou a expiré.'
      );
    }

    const familyId = uuidv4();
    const accessToken = generateAccessToken({
      userId: user.user_id,
      role: user.role,
    });
    const refreshToken = generateRefreshToken({
      userId: user.user_id,
      familyId,
    });

    const decodedRefreshToken = jwt.decode(refreshToken);
    const expiresAt = new Date(decodedRefreshToken.exp * 1000);

    await refreshTokenRepository.create(
      user.user_id,
      refreshToken,
      familyId,
      expiresAt
    );

    return {
      user: new UserDto(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Gère le rafraîchissement des jetons avec détection de réutilisation.
   * @param {string} oldRefreshToken - Le jeton de rafraîchissement reçu du client.
   * @returns {Promise<{accessToken: string, refreshToken: string}>} La nouvelle paire de jetons.
   */
  async refreshTokens(oldRefreshToken) {
    if (!oldRefreshToken) {
      throw new UnauthorizedException('Jeton de rafraîchissement manquant.');
    }

    const storedToken =
      await refreshTokenRepository.findByToken(oldRefreshToken);

    if (!storedToken) {
      try {
        const decoded = jwt.verify(
          oldRefreshToken,
          process.env.JWT_REFRESH_SECRET
        );
        await refreshTokenRepository.revokeFamily(decoded.familyId);
        // On lève l'exception de sécurité spécifique.
        throw new ForbiddenException(
          'Tentative de réutilisation de jeton détectée. Session révoquée.'
        );
      } catch (error) {
        // Si l'erreur est celle que nous venons de lever, on la propage.
        if (error instanceof ForbiddenException) {
          throw error;
        }
        // Pour toute autre erreur (de jwt.verify), le token est simplement invalide.
        throw new ForbiddenException('Jeton de rafraîchissement invalide.');
      }
    }

    if (storedToken.is_revoked) {
      await refreshTokenRepository.revokeFamily(storedToken.family_id);
      throw new ForbiddenException(
        'Tentative de réutilisation de jeton détectée. Session révoquée.'
      );
    }

    await refreshTokenRepository.revokeTokenById(storedToken.token_id);

    const user = await userRepository.findById(storedToken.user_id);
    if (!user) {
      throw new ForbiddenException('Utilisateur associé au jeton non trouvé.');
    }

    const familyId = storedToken.family_id;
    const accessToken = generateAccessToken({
      userId: user.user_id,
      role: user.role,
    });
    const newRefreshToken = generateRefreshToken({
      userId: user.user_id,
      familyId,
    });
    const decodedRefreshToken = jwt.decode(newRefreshToken);
    const expiresAt = new Date(decodedRefreshToken.exp * 1000);

    await refreshTokenRepository.create(
      user.user_id,
      newRefreshToken,
      familyId,
      expiresAt
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Gère la déconnexion en révoquant la famille de jetons.
   * @param {string} refreshToken - Le jeton de rafraîchissement du cookie.
   * @returns {Promise<void>}
   */
  async logout(refreshToken) {
    if (!refreshToken) return;

    const storedToken = await refreshTokenRepository.findByToken(refreshToken);
    if (storedToken) {
      await refreshTokenRepository.revokeFamily(storedToken.family_id);
    }
  }
}

export default new AuthService();
