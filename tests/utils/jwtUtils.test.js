/**
 * @file Tests unitaires pour les utilitaires JWT.
 * @description Valide que les fonctions de génération de jetons appellent la bibliothèque JWT
 * avec les bons secrets, charges utiles et options d'expiration.
 */
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Mocker la bibliothèque jsonwebtoken pour isoler nos utilitaires
jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: jest.fn(),
  },
}));

const { default: jwt } = await import("jsonwebtoken");
const { generateAccessToken, generateRefreshToken } = await import(
  "../../src/utils/jwtUtils.js"
);

describe("jwtUtils", () => {
  /**
   * @description Réinitialise les mocks et configure les variables d'environnement avant chaque test.
   */
  beforeEach(() => {
    jest.clearAllMocks();

    // Définir des variables d'environnement de test pour la prévisibilité
    process.env.JWT_ACCESS_SECRET = "access-secret-for-test";
    process.env.JWT_REFRESH_SECRET = "refresh-secret-for-test";
    process.env.JWT_ACCESS_EXPIRATION = "10m";
    process.env.JWT_REFRESH_EXPIRATION = "5d";
  });

  describe("generateAccessToken", () => {
    /**
     * @description Vérifie que `generateAccessToken` utilise le bon secret et la bonne expiration.
     */
    it("doit appeler jwt.sign avec les secrets et expirations corrects pour un accessToken", () => {
      const payload = { userId: "123", role: "admin" };
      jwt.sign.mockReturnValue("mock-access-token");

      const token = generateAccessToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(payload, "access-secret-for-test", {
        expiresIn: "10m",
      });
      expect(token).toBe("mock-access-token");
    });
  });

  describe("generateRefreshToken", () => {
    /**
     * @description Vérifie que `generateRefreshToken` utilise le bon secret et la bonne expiration.
     */
    it("doit appeler jwt.sign avec les secrets et expirations corrects pour un refreshToken", () => {
      const payload = { userId: "123", familyId: "abc" };
      jwt.sign.mockReturnValue("mock-refresh-token");

      const token = generateRefreshToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        "refresh-secret-for-test",
        { expiresIn: "5d" }
      );
      expect(token).toBe("mock-refresh-token");
    });
  });
});
