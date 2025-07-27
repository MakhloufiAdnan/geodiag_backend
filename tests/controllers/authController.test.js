/**
 * @file Tests unitaires complets pour AuthController.
 * @description Valide que le contrôleur gère correctement les succès (création de cookie, réponse JSON)
 * et les échecs (propagation d'erreur via `next`) pour chaque point d'accès.
 */

import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Mocker le service d'authentification pour isoler complètement le contrôleur.
jest.unstable_mockModule("../../src/services/authService.js", () => ({
  default: {
    loginCompanyAdmin: jest.fn(),
    loginTechnician: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
  },
}));

const { default: authService } = await import(
  "../../src/services/authService.js"
);
const { default: authController } = await import(
  "../../src/controllers/authController.js"
);

describe("AuthController", () => {
  let mockReq, mockRes, mockNext;

  /**
   * @description Prépare un environnement de test propre avant chaque exécution en réinitialisant les mocks.
   */
  beforeEach(() => {
    mockReq = { body: {}, cookies: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      send: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe("loginCompany", () => {
    /**
     * @description Teste le chemin de succès pour la connexion d'un administrateur.
     */
    it("doit créer un cookie et retourner un accessToken en cas de succès", async () => {
      const authResult = {
        accessToken: "access",
        refreshToken: "refresh",
        user: { id: 1 },
      };
      authService.loginCompanyAdmin.mockResolvedValue(authResult);
      mockReq.body = { email: "a", password: "b" };

      await authController.loginCompany(mockReq, mockRes, mockNext);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        "refreshToken",
        "refresh",
        expect.any(Object)
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        accessToken: "access",
        user: { id: 1 },
      });
    });

    /**
     * @description Teste le chemin d'erreur pour la connexion d'un administrateur.
     */
    it("doit appeler next(error) si le service lève une erreur", async () => {
      const error = new Error("Erreur de service");
      authService.loginCompanyAdmin.mockRejectedValue(error);
      mockReq.body = { email: "a", password: "b" };

      await authController.loginCompany(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe("loginTechnician", () => {
    /**
     * @description Teste le chemin de succès pour la connexion d'un technicien.
     */
    it("doit créer un cookie et retourner un accessToken en cas de succès", async () => {
      const authResult = {
        accessToken: "tech-access",
        refreshToken: "tech-refresh",
        user: { id: 2 },
      };
      authService.loginTechnician.mockResolvedValue(authResult);
      mockReq.body = { email: "tech@a.com", password: "b" };

      await authController.loginTechnician(mockReq, mockRes, mockNext);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        "refreshToken",
        "tech-refresh",
        expect.any(Object)
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        accessToken: "tech-access",
        user: { id: 2 },
      });
    });

    /**
     * @description Teste le chemin d'erreur pour la connexion d'un technicien.
     */
    it("doit appeler next(error) si le service lève une erreur", async () => {
      const error = new Error("Erreur de licence");
      authService.loginTechnician.mockRejectedValue(error);
      mockReq.body = { email: "tech@a.com", password: "b" };

      await authController.loginTechnician(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe("refresh", () => {
    /**
     * @description Teste le chemin de succès pour le rafraîchissement d'un jeton.
     */
    it("doit mettre à jour le cookie et retourner un nouvel accessToken", async () => {
      const refreshResult = {
        accessToken: "new-access",
        refreshToken: "new-refresh",
      };
      authService.refreshTokens.mockResolvedValue(refreshResult);
      mockReq.cookies.refreshToken = "old-refresh";

      await authController.refresh(mockReq, mockRes, mockNext);

      expect(authService.refreshTokens).toHaveBeenCalledWith("old-refresh");
      expect(mockRes.cookie).toHaveBeenCalledWith(
        "refreshToken",
        "new-refresh",
        expect.any(Object)
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ accessToken: "new-access" });
    });

    /**
     * @description Teste le chemin d'erreur pour le rafraîchissement, en vérifiant que le cookie est effacé.
     */
    it("doit effacer le cookie et appeler next(error) si le service lève une erreur", async () => {
      const error = new Error("Token révoqué");
      authService.refreshTokens.mockRejectedValue(error);
      mockReq.cookies.refreshToken = "revoked-token";

      await authController.refresh(mockReq, mockRes, mockNext);

      expect(mockRes.clearCookie).toHaveBeenCalledWith("refreshToken", {
        path: "/api/auth",
      });
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe("logout", () => {
    /**
     * @description Teste le chemin de succès pour la déconnexion d'un utilisateur.
     */
    it("doit appeler le service de déconnexion et effacer le cookie", async () => {
      mockReq.cookies.refreshToken = "valid-token";

      await authController.logout(mockReq, mockRes, mockNext);

      expect(authService.logout).toHaveBeenCalledWith("valid-token");
      expect(mockRes.clearCookie).toHaveBeenCalledWith("refreshToken", {
        path: "/api/auth",
      });
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    /**
     * @description Teste le chemin d'erreur pour la déconnexion.
     */
    it("doit appeler next(error) si le service de déconnexion lève une erreur", async () => {
      const error = new Error("Erreur de base de données");
      authService.logout.mockRejectedValue(error);
      mockReq.cookies.refreshToken = "valid-token";

      await authController.logout(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
