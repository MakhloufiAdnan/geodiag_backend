import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import {
  UnauthorizedException,
} from "../../src/exceptions/apiException.js";
import { mockAdminUser, mockTechnicianUser } from "../../mocks/mockData.js";

/**
 * @file Tests unitaires complets pour AuthService.
 * @description Cette suite de tests valide tous les chemins logiques du service d'authentification,
 * y compris les succès, les échecs et la logique de sécurité de rotation des jetons.
 */

// Mocker toutes les dépendances pour isoler le service
jest.unstable_mockModule("../../src/repositories/userRepository.js", () => ({
  default: { findByEmail: jest.fn(), findById: jest.fn() },
}));
jest.unstable_mockModule("../../src/repositories/licenseRepository.js", () => ({
  default: { findActiveByCompanyId: jest.fn() },
}));
jest.unstable_mockModule(
  "../../src/repositories/refreshTokenRepository.js",
  () => ({
    default: {
      create: jest.fn(),
      findByToken: jest.fn(),
      revokeFamily: jest.fn(),
      revokeTokenById: jest.fn(),
    },
  })
);
jest.unstable_mockModule("bcrypt", () => ({ default: { compare: jest.fn() } }));
jest.unstable_mockModule("../../src/utils/jwtUtils.js", () => ({
  generateAccessToken: jest.fn(() => "mock-access-token"),
  generateRefreshToken: jest.fn(() => "mock-refresh-token"),
}));
jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    decode: jest.fn(() => ({ exp: Date.now() / 1000 + 3600 })),
    verify: jest.fn(),
  },
}));

const { default: userRepository } = await import(
  "../../src/repositories/userRepository.js"
);
const { default: licenseRepository } = await import(
  "../../src/repositories/licenseRepository.js"
);
const { default: refreshTokenRepository } = await import(
  "../../src/repositories/refreshTokenRepository.js"
);
const { default: bcrypt } = await import("bcrypt");
const { default: authService } = await import(
  "../../src/services/authService.js"
);

describe("AuthService", () => {
  beforeEach(() => jest.clearAllMocks());

  /**
   * @describe Suite de tests pour la méthode `loginCompanyAdmin`.
   */
  describe("loginCompanyAdmin", () => {
    /**
     * @it Doit retourner les jetons pour une connexion admin réussie.
     */
    it("doit retourner les jetons pour une connexion admin réussie", async () => {
      // Arrange
      userRepository.findByEmail.mockResolvedValue(mockAdminUser);
      bcrypt.compare.mockResolvedValue(true);

      // Act
      const result = await authService.loginCompanyAdmin("admin@test.com", "password");

      // Assert
      expect(result.user.userId).toBe(mockAdminUser.user_id);
      expect(refreshTokenRepository.create).toHaveBeenCalled();
    });

    /**
     * @it Doit lever une UnauthorizedException si l'utilisateur n'est pas trouvé.
     */
    it("doit lever une UnauthorizedException si l'utilisateur n'est pas trouvé", async () => {
      // Arrange
      userRepository.findByEmail.mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        authService.loginCompanyAdmin("unknown@test.com", "pass")
      ).rejects.toThrow(UnauthorizedException);
    });

    /**
     * @it Doit lever une UnauthorizedException si le mot de passe est incorrect.
     */
    it("doit lever une UnauthorizedException si le mot de passe est incorrect", async () => {
      // Arrange
      userRepository.findByEmail.mockResolvedValue(mockAdminUser);
      bcrypt.compare.mockResolvedValue(false);
      
      // Act & Assert
      await expect(
        authService.loginCompanyAdmin("admin@test.com", "wrong-pass")
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  /**
   * @describe Suite de tests pour la méthode `loginTechnician`.
   */
  describe("loginTechnician", () => {
    /**
     * @it Doit retourner les jetons pour une connexion technicien réussie avec une licence valide.
     */
    it("doit retourner les jetons pour une connexion technicien réussie avec une licence active", async () => {
      // Arrange
      userRepository.findByEmail.mockResolvedValue(mockTechnicianUser);
      bcrypt.compare.mockResolvedValue(true);
      licenseRepository.findActiveByCompanyId.mockResolvedValue({ status: "active" });

      // Act
      const result = await authService.loginTechnician("tech@test.com", "password");

      // Assert
      expect(result.user.userId).toBe(mockTechnicianUser.user_id);
      expect(refreshTokenRepository.create).toHaveBeenCalled();
    });
  });

  /**
   * @describe Suite de tests pour la méthode `refreshTokens`.
   */
  describe("refreshTokens", () => {
    const oldRefreshToken = "old-refresh-token";
    const storedToken = {
      token_id: "rt-1",
      user_id: "user-1",
      family_id: "family-1",
      is_revoked: false,
    };

    /**
     * @it Doit retourner une nouvelle paire de jetons si le refreshToken est valide.
     */
    it("doit retourner une nouvelle paire de jetons si le refreshToken est valide", async () => {
      // Arrange
      refreshTokenRepository.findByToken.mockResolvedValue(storedToken);
      userRepository.findById.mockResolvedValue(mockAdminUser);

      // Act
      const result = await authService.refreshTokens(oldRefreshToken);

      // Assert
      expect(refreshTokenRepository.revokeTokenById).toHaveBeenCalledWith(storedToken.token_id);
      expect(refreshTokenRepository.create).toHaveBeenCalled();
      expect(result).toHaveProperty("accessToken", "mock-access-token");
    });

    /**
     * @it Doit détecter la réutilisation si le token est trouvé mais déjà révoqué.
     */
    it("doit détecter la réutilisation si le token est trouvé mais déjà révoqué", async () => {
      // Arrange
      const revokedToken = { ...storedToken, is_revoked: true };
      refreshTokenRepository.findByToken.mockResolvedValue(revokedToken);

      // Act & Assert
      await expect(authService.refreshTokens(oldRefreshToken)).rejects.toThrow(
        "Tentative de réutilisation de jeton détectée. Session révoquée."
      );
      expect(refreshTokenRepository.revokeFamily).toHaveBeenCalledWith(revokedToken.family_id);
    });
  });

  /**
   * @describe Suite de tests pour la méthode `logout`.
   */
  describe("logout", () => {
    /**
     * @it Doit révoquer la famille de jetons si un token valide est fourni.
     */
    it("doit révoquer la famille de jetons si un token valide est fourni", async () => {
      // Arrange
      const storedToken = { family_id: "family-1" };
      refreshTokenRepository.findByToken.mockResolvedValue(storedToken);

      // Act
      await authService.logout("valid-refresh-token");

      // Assert
      expect(refreshTokenRepository.revokeFamily).toHaveBeenCalledWith("family-1");
    });

    /**
     * @it Ne doit rien faire si aucun token n'est fourni.
     */
    it("ne doit rien faire si aucun token n'est fourni", async () => {
        // Act
        await authService.logout(null);
  
        // Assert
        expect(refreshTokenRepository.revokeFamily).not.toHaveBeenCalled();
      });
  });
});