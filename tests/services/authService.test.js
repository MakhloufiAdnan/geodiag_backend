import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  UnauthorizedException,
  ForbiddenException,
} from '../../src/exceptions/ApiException.js';
import { mockAdminUser, mockTechnicianUser } from '../../mocks/mockData.js';

/**
 * @file Tests unitaires complets pour AuthService.
 * @description Cette suite de tests valide tous les chemins logiques du service d'authentification,
 * y compris les succès, les échecs et la logique de sécurité de rotation des jetons.
 */

// Mocker toutes les dépendances pour isoler le service
const mockUserRepositoryFindByEmail = jest.fn();
const mockUserRepositoryFindById = jest.fn();
const mockLicenseRepositoryFindActiveByCompanyId = jest.fn();
const mockRefreshTokenRepositoryCreate = jest.fn();
const mockRefreshTokenRepositoryFindByToken = jest.fn();
const mockRefreshTokenRepositoryRevokeFamily = jest.fn();
const mockRefreshTokenRepositoryRevokeTokenById = jest.fn();
const mockBcryptCompare = jest.fn();
const mockGenerateAccessToken = jest.fn();
const mockGenerateRefreshToken = jest.fn();
const mockJwtDecode = jest.fn();
const mockJwtVerify = jest.fn();

jest.unstable_mockModule('../../src/repositories/userRepository.js', () => ({
  default: {
    findByEmail: mockUserRepositoryFindByEmail,
    findById: mockUserRepositoryFindById,
  },
}));
jest.unstable_mockModule('../../src/repositories/licenseRepository.js', () => ({
  default: {
    findActiveByCompanyId: mockLicenseRepositoryFindActiveByCompanyId,
  },
}));
jest.unstable_mockModule(
  '../../src/repositories/refreshTokenRepository.js',
  () => ({
    default: {
      create: mockRefreshTokenRepositoryCreate,
      findByToken: mockRefreshTokenRepositoryFindByToken,
      revokeFamily: mockRefreshTokenRepositoryRevokeFamily,
      revokeTokenById: mockRefreshTokenRepositoryRevokeTokenById,
    },
  })
);
jest.unstable_mockModule('bcrypt', () => ({
  default: { compare: mockBcryptCompare },
}));
jest.unstable_mockModule('../../src/utils/jwtUtils.js', () => ({
  generateAccessToken: mockGenerateAccessToken,
  generateRefreshToken: mockGenerateRefreshToken,
}));
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    decode: mockJwtDecode,
    verify: mockJwtVerify,
  },
}));

// Import du service après la configuration de tous les mocks
const { default: authService } = await import(
  '../../src/services/authService.js'
);

/**
 * Suite de tests pour le service d'authentification (AuthService).
 * @module AuthServiceTests
 */
describe('AuthService', () => {
  /**
   * Exécuté avant chaque test.
   * Réinitialise tous les mocks Jest.
   */
  beforeEach(() => {
    jest.clearAllMocks();
    // Valeurs par défaut pour les mocks afin de simplifier les tests positifs
    mockGenerateAccessToken.mockReturnValue('mock-access-token');
    mockGenerateRefreshToken.mockReturnValue('mock-refresh-token');
    mockJwtDecode.mockReturnValue({ exp: Date.now() / 1000 + 3600 }); // Token valide pour 1 heure
  });

  /**
   * Suite de tests pour la méthode `loginCompanyAdmin`.
   * @memberof AuthServiceTests
   */
  describe('loginCompanyAdmin', () => {
    /**
     * Teste la connexion réussie d'un administrateur de compagnie.
     * @test
     */
    it('doit retourner les jetons pour une connexion admin réussie', async () => {
      // Arrange
      mockUserRepositoryFindByEmail.mockResolvedValue(mockAdminUser);
      mockBcryptCompare.mockResolvedValue(true);

      // Act
      const result = await authService.loginCompanyAdmin(
        'admin@test.com',
        'password'
      );

      // Assert
      expect(mockUserRepositoryFindByEmail).toHaveBeenCalledWith(
        'admin@test.com'
      );
      expect(mockBcryptCompare).toHaveBeenCalledWith(
        'password',
        mockAdminUser.password_hash
      );
      expect(result.user.userId).toBe(mockAdminUser.user_id);
      expect(mockGenerateAccessToken).toHaveBeenCalledWith({
        userId: mockAdminUser.user_id,
        role: mockAdminUser.role,
      });
      expect(mockGenerateRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({ userId: mockAdminUser.user_id })
      );
      expect(mockRefreshTokenRepositoryCreate).toHaveBeenCalledWith(
        mockAdminUser.user_id,
        'mock-refresh-token',
        expect.any(String), // familyId
        expect.any(Date) // expiresAt
      );
      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
    });

    /**
     * Teste la levée d'une `UnauthorizedException` si l'utilisateur n'est pas trouvé.
     * @test
     */
    it("doit lever une UnauthorizedException si l'utilisateur n'est pas trouvé", async () => {
      // Arrange
      mockUserRepositoryFindByEmail.mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        authService.loginCompanyAdmin('unknown@test.com', 'pass')
      ).rejects.toThrow(UnauthorizedException);
      expect(mockUserRepositoryFindByEmail).toHaveBeenCalledWith(
        'unknown@test.com'
      );
      expect(mockBcryptCompare).not.toHaveBeenCalled(); // Pas d'appel à bcrypt si l'utilisateur n'est pas trouvé
      expect(mockRefreshTokenRepositoryCreate).not.toHaveBeenCalled();
    });

    /**
     * Teste la levée d'une `UnauthorizedException` si le mot de passe est incorrect.
     * @test
     */
    it('doit lever une UnauthorizedException si le mot de passe est incorrect', async () => {
      // Arrange
      mockUserRepositoryFindByEmail.mockResolvedValue(mockAdminUser);
      mockBcryptCompare.mockResolvedValue(false);

      // Act & Assert
      await expect(
        authService.loginCompanyAdmin('admin@test.com', 'wrong-pass')
      ).rejects.toThrow(UnauthorizedException);
      expect(mockUserRepositoryFindByEmail).toHaveBeenCalledWith(
        'admin@test.com'
      );
      expect(mockBcryptCompare).toHaveBeenCalledWith(
        'wrong-pass',
        mockAdminUser.password_hash
      );
      expect(mockRefreshTokenRepositoryCreate).not.toHaveBeenCalled();
    });

    /**
     * Teste la levée d'une `ForbiddenException` si l'utilisateur trouvé n'a pas le rôle 'admin'.
     * @test
     */
    it("doit lever une ForbiddenException si l'utilisateur trouvé n'est pas un admin", async () => {
      // Arrange
      mockUserRepositoryFindByEmail.mockResolvedValue(mockTechnicianUser); // Un technicien essaie de se connecter comme admin
      mockBcryptCompare.mockResolvedValue(true);

      // Act & Assert
      await expect(
        authService.loginCompanyAdmin('tech@test.com', 'password')
      ).rejects.toThrow(ForbiddenException);
      expect(mockUserRepositoryFindByEmail).toHaveBeenCalledWith(
        'tech@test.com'
      );
      expect(mockBcryptCompare).toHaveBeenCalledWith(
        'password',
        mockTechnicianUser.password_hash
      );
      expect(mockRefreshTokenRepositoryCreate).not.toHaveBeenCalled(); // Pas de création de token
    });
  });

  /**
   * Suite de tests pour la méthode `loginTechnician`.
   * @memberof AuthServiceTests
   */
  describe('loginTechnician', () => {
    /**
     * Teste la connexion réussie d'un technicien avec une licence valide.
     * @test
     */
    it('doit retourner les jetons pour une connexion technicien réussie avec une licence active', async () => {
      // Arrange
      mockUserRepositoryFindByEmail.mockResolvedValue(mockTechnicianUser);
      mockBcryptCompare.mockResolvedValue(true);
      mockLicenseRepositoryFindActiveByCompanyId.mockResolvedValue({
        status: 'active',
      });

      // Act
      const result = await authService.loginTechnician(
        'tech@test.com',
        'password'
      );

      // Assert
      expect(mockUserRepositoryFindByEmail).toHaveBeenCalledWith(
        'tech@test.com'
      );
      expect(mockBcryptCompare).toHaveBeenCalledWith(
        'password',
        mockTechnicianUser.password_hash
      );
      expect(mockLicenseRepositoryFindActiveByCompanyId).toHaveBeenCalledWith(
        mockTechnicianUser.company_id
      );
      expect(result.user.userId).toBe(mockTechnicianUser.user_id);
      expect(mockGenerateAccessToken).toHaveBeenCalledWith({
        userId: mockTechnicianUser.user_id,
        role: mockTechnicianUser.role,
      });
      expect(mockGenerateRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({ userId: mockTechnicianUser.user_id })
      );
      expect(mockRefreshTokenRepositoryCreate).toHaveBeenCalledWith(
        mockTechnicianUser.user_id,
        'mock-refresh-token',
        expect.any(String), // familyId
        expect.any(Date) // expiresAt
      );
      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
    });

    /**
     * Teste la levée d'une `ForbiddenException` si l'utilisateur trouvé n'a pas le rôle 'technician'.
     * @test
     */
    it("doit lever une ForbiddenException si l'utilisateur trouvé n'est pas un technicien", async () => {
      // Arrange
      mockUserRepositoryFindByEmail.mockResolvedValue(mockAdminUser); // Un admin essaie de se connecter comme technicien
      mockBcryptCompare.mockResolvedValue(true);

      // Act & Assert
      await expect(
        authService.loginTechnician('admin@test.com', 'password')
      ).rejects.toThrow(ForbiddenException);
      expect(mockUserRepositoryFindByEmail).toHaveBeenCalledWith(
        'admin@test.com'
      );
      expect(mockBcryptCompare).toHaveBeenCalledWith(
        'password',
        mockAdminUser.password_hash
      );
      expect(mockLicenseRepositoryFindActiveByCompanyId).not.toHaveBeenCalled(); // Pas de vérification de licence
      expect(mockRefreshTokenRepositoryCreate).not.toHaveBeenCalled();
    });

    /**
     * Teste la levée d'une `ForbiddenException` si aucune licence active n'est trouvée pour la compagnie du technicien.
     * @test
     */
    it('doit lever une ForbiddenException si la licence de la compagnie est inactive ou expirée', async () => {
      // Arrange
      mockUserRepositoryFindByEmail.mockResolvedValue(mockTechnicianUser);
      mockBcryptCompare.mockResolvedValue(true);
      mockLicenseRepositoryFindActiveByCompanyId.mockResolvedValue(null); // Pas de licence active

      // Act & Assert
      await expect(
        authService.loginTechnician('tech@test.com', 'password')
      ).rejects.toThrow(ForbiddenException);
      expect(mockUserRepositoryFindByEmail).toHaveBeenCalledWith(
        'tech@test.com'
      );
      expect(mockBcryptCompare).toHaveBeenCalledWith(
        'password',
        mockTechnicianUser.password_hash
      );
      expect(mockLicenseRepositoryFindActiveByCompanyId).toHaveBeenCalledWith(
        mockTechnicianUser.company_id
      );
      expect(mockRefreshTokenRepositoryCreate).not.toHaveBeenCalled();
    });
  });

  /**
   * Suite de tests pour la méthode `refreshTokens`.
   * @memberof AuthServiceTests
   */
  describe('refreshTokens', () => {
    /**
     * Ancien jeton de rafraîchissement mocké.
     * @type {string}
     */
    const oldRefreshToken = 'old-refresh-token';
    /**
     * Jeton stocké mocké dans la base de données.
     * @type {object}
     */
    const storedToken = {
      token_id: 'rt-1',
      user_id: 'user-1',
      family_id: 'family-1',
      is_revoked: false,
    };

    /**
     * Teste le rafraîchissement réussi des jetons avec un `refreshToken` valide.
     * @test
     */
    it('doit retourner une nouvelle paire de jetons si le refreshToken est valide', async () => {
      // Arrange
      mockRefreshTokenRepositoryFindByToken.mockResolvedValue(storedToken);
      mockUserRepositoryFindById.mockResolvedValue(mockAdminUser); // L'utilisateur associé au token

      // Act
      const result = await authService.refreshTokens(oldRefreshToken);

      // Assert
      expect(mockRefreshTokenRepositoryFindByToken).toHaveBeenCalledWith(
        oldRefreshToken
      );
      expect(mockRefreshTokenRepositoryRevokeTokenById).toHaveBeenCalledWith(
        storedToken.token_id
      );
      expect(mockUserRepositoryFindById).toHaveBeenCalledWith(
        storedToken.user_id
      );
      expect(mockGenerateAccessToken).toHaveBeenCalledWith({
        userId: mockAdminUser.user_id,
        role: mockAdminUser.role,
      });
      expect(mockGenerateRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockAdminUser.user_id,
          familyId: storedToken.family_id,
        })
      );
      expect(mockRefreshTokenRepositoryCreate).toHaveBeenCalledWith(
        mockAdminUser.user_id,
        'mock-refresh-token',
        storedToken.family_id,
        expect.any(Date)
      );
      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
    });

    /**
     * Teste la levée d'une `UnauthorizedException` si le `refreshToken` est manquant.
     * @test
     */
    it('doit lever une UnauthorizedException si le refreshToken est manquant', async () => {
      // Arrange (oldRefreshToken est null/undefined)

      // Act & Assert
      await expect(authService.refreshTokens(null)).rejects.toThrow(
        UnauthorizedException
      );
      expect(mockRefreshTokenRepositoryFindByToken).not.toHaveBeenCalled();
      expect(mockJwtVerify).not.toHaveBeenCalled();
      expect(mockRefreshTokenRepositoryRevokeFamily).not.toHaveBeenCalled();
    });

    /**
     * Teste la détection de réutilisation si le token est trouvé mais déjà révoqué.
     * @test
     */
    it('doit détecter la réutilisation si le token est trouvé mais déjà révoqué', async () => {
      // Arrange
      const revokedToken = { ...storedToken, is_revoked: true };
      mockRefreshTokenRepositoryFindByToken.mockResolvedValue(revokedToken);

      // Act & Assert
      await expect(authService.refreshTokens(oldRefreshToken)).rejects.toThrow(
        'Tentative de réutilisation de jeton détectée. Session révoquée.'
      );
      expect(mockRefreshTokenRepositoryFindByToken).toHaveBeenCalledWith(
        oldRefreshToken
      );
      expect(mockRefreshTokenRepositoryRevokeFamily).toHaveBeenCalledWith(
        revokedToken.family_id
      );
      expect(mockRefreshTokenRepositoryRevokeTokenById).not.toHaveBeenCalled(); // Pas de révocation individuelle
    });

    /**
     * Teste la levée d'une `ForbiddenException` si le token n'est pas trouvé en DB
     * et que `jwt.verify` échoue (token invalide/expiré).
     * @test
     */
    it("doit lever une ForbiddenException si le token n'est pas trouvé en DB et que jwt.verify échoue", async () => {
      // Arrange
      mockRefreshTokenRepositoryFindByToken.mockResolvedValue(null); // Token non trouvé en DB
      mockJwtVerify.mockImplementation(() => {
        throw new Error('jwt malformed'); // Simule une erreur de vérification JWT
      });

      // Act & Assert
      await expect(authService.refreshTokens(oldRefreshToken)).rejects.toThrow(
        ForbiddenException
      );
      expect(mockRefreshTokenRepositoryFindByToken).toHaveBeenCalledWith(
        oldRefreshToken
      );
      expect(mockJwtVerify).toHaveBeenCalledWith(
        oldRefreshToken,
        process.env.JWT_REFRESH_SECRET
      );
      expect(mockRefreshTokenRepositoryRevokeFamily).not.toHaveBeenCalled(); // Pas de révocation de famille si jwt.verify échoue
    });

    /**
     * Teste la levée d'une `ForbiddenException` et la révocation de famille
     * si le token n'est pas trouvé en DB mais `jwt.verify` réussit (cas de réutilisation).
     * @test
     */
    it('doit lever une ForbiddenException et révoquer la famille si le token est réutilisé (non trouvé en DB mais valide)', async () => {
      // Arrange
      mockRefreshTokenRepositoryFindByToken.mockResolvedValue(null); // Token non trouvé en DB
      const decodedToken = { familyId: 'family-123', userId: 'user-123' };
      mockJwtVerify.mockReturnValue(decodedToken); // Le token est valide mais non stocké (réutilisation)

      // Act & Assert
      await expect(authService.refreshTokens(oldRefreshToken)).rejects.toThrow(
        'Tentative de réutilisation de jeton détectée. Session révoquée.'
      );
      expect(mockRefreshTokenRepositoryFindByToken).toHaveBeenCalledWith(
        oldRefreshToken
      );
      expect(mockJwtVerify).toHaveBeenCalledWith(
        oldRefreshToken,
        process.env.JWT_REFRESH_SECRET
      );
      expect(mockRefreshTokenRepositoryRevokeFamily).toHaveBeenCalledWith(
        decodedToken.familyId
      );
    });

    /**
     * Teste la levée d'une `ForbiddenException` si l'utilisateur associé au token n'est pas trouvé.
     * @test
     */
    it("doit lever une ForbiddenException si l'utilisateur associé au jeton n'est pas trouvé", async () => {
      // Arrange
      mockRefreshTokenRepositoryFindByToken.mockResolvedValue(storedToken);
      mockUserRepositoryFindById.mockResolvedValue(null); // Utilisateur non trouvé

      // Act & Assert
      await expect(authService.refreshTokens(oldRefreshToken)).rejects.toThrow(
        'Utilisateur associé au jeton non trouvé.'
      );
      expect(mockRefreshTokenRepositoryFindByToken).toHaveBeenCalledWith(
        oldRefreshToken
      );
      expect(mockRefreshTokenRepositoryRevokeTokenById).toHaveBeenCalledWith(
        storedToken.token_id
      );
      expect(mockUserRepositoryFindById).toHaveBeenCalledWith(
        storedToken.user_id
      );
      expect(mockGenerateAccessToken).not.toHaveBeenCalled(); // Pas de nouveau token généré
      expect(mockRefreshTokenRepositoryCreate).not.toHaveBeenCalled(); // Pas de nouveau token créé
    });
  });

  /**
   * Suite de tests pour la méthode `logout`.
   * @memberof AuthServiceTests
   */
  describe('logout', () => {
    /**
     * Teste la révocation de la famille de jetons si un token valide est fourni.
     * @test
     */
    it('doit révoquer la famille de jetons si un token valide est fourni', async () => {
      // Arrange
      const storedToken = { family_id: 'family-1' };
      mockRefreshTokenRepositoryFindByToken.mockResolvedValue(storedToken);

      // Act
      await authService.logout('valid-refresh-token');

      // Assert
      expect(mockRefreshTokenRepositoryFindByToken).toHaveBeenCalledWith(
        'valid-refresh-token'
      );
      expect(mockRefreshTokenRepositoryRevokeFamily).toHaveBeenCalledWith(
        'family-1'
      );
    });

    /**
     * Teste que la méthode ne fait rien si aucun token n'est fourni.
     * @test
     */
    it("ne doit rien faire si aucun token n'est fourni", async () => {
      // Act
      await authService.logout(null);

      // Assert
      expect(mockRefreshTokenRepositoryFindByToken).not.toHaveBeenCalled();
      expect(mockRefreshTokenRepositoryRevokeFamily).not.toHaveBeenCalled();
    });

    /**
     * Teste que la méthode ne fait rien si le token est fourni mais non trouvé en base de données.
     * @test
     */
    it('ne doit rien faire si le token est fourni mais non trouvé en base de données', async () => {
      // Arrange
      mockRefreshTokenRepositoryFindByToken.mockResolvedValue(null);

      // Act
      await authService.logout('non-existent-token');

      // Assert
      expect(mockRefreshTokenRepositoryFindByToken).toHaveBeenCalledWith(
        'non-existent-token'
      );
      expect(mockRefreshTokenRepositoryRevokeFamily).not.toHaveBeenCalled();
    });
  });
});
