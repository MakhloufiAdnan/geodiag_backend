/**
 * @file Tests d'intégration pour le flux d'authentification complet (/api/auth).
 * @description Ce test vérifie la connexion, le rafraîchissement de token et la déconnexion.
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import { pool } from "../../src/db/index.js";
import bcrypt from "bcrypt"; // FIX: Ajout de l'import manquant
import { setupIntegrationTest } from "../helpers/integrationTestSetup.js";
import redisClient from "../../src/config/redisClient.js";

describe("Authentication Flow (/api/auth)", () => {
  const getAgent = setupIntegrationTest();
  let agent;

  const adminEmail = "final-integration-auth@test.com";
  const adminPassword = "password123";

  beforeAll(async () => {
    await pool.query(
      "TRUNCATE companies, users, refresh_tokens RESTART IDENTITY CASCADE"
    );
    const companyRes = await pool.query(
      "INSERT INTO companies (name, email) VALUES ($1, $2) RETURNING company_id",
      ["Final Auth Co", "final-auth-co@test.com"]
    );
    const companyId = companyRes.rows[0].company_id;
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      "INSERT INTO users (company_id, email, password_hash, role, is_active) VALUES ($1, $2, $3, 'admin', true)",
      [companyId, adminEmail, passwordHash]
    );
  });

  beforeEach(() => {
    agent = getAgent();
  });

  afterAll(async () => {
    await pool.end();
    await redisClient.quit();
  });

  let refreshTokenFromLogin;

  describe("1. Login", () => {
    it("POST /login - Should authenticate, return an accessToken and a refreshToken cookie", async () => {
      // Arrange
      const credentials = { email: adminEmail, password: adminPassword };

      // Act
      const response = await agent
        .post("/api/auth/company/login")
        .send(credentials);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("accessToken");
      const cookie = response.headers["set-cookie"][0];
      expect(cookie).toContain("refreshToken=");

      refreshTokenFromLogin = cookie.split(";")[0].split("=")[1];
    });
  });

  describe("2. Session Refresh", () => {
    it("POST /refresh - Should use the cookie to get a new accessToken", async () => {
      // Arrange
      await agent
        .post("/api/auth/company/login")
        .send({ email: adminEmail, password: adminPassword });
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Act
      const response = await agent.post("/api/auth/refresh").send();

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      const newCookie = response.headers["set-cookie"][0];
      const newRefreshToken = newCookie.split(";")[0].split("=")[1];
      expect(newRefreshToken).not.toBe(refreshTokenFromLogin);
    });
  });

  describe("3. Logout", () => {
    it("POST /logout - Should clear the cookie and invalidate the session", async () => {
      // Arrange
      await agent
        .post("/api/auth/company/login")
        .send({ email: adminEmail, password: adminPassword });

      // Act
      const response = await agent.post("/api/auth/logout").send();

      // Assert
      expect(response.status).toBe(204);
      const cookie = response.headers["set-cookie"][0];
      expect(cookie).toContain("Expires=Thu, 01 Jan 1970");
    });
  });

  describe("4. Access attempt after Logout", () => {
    it("POST /refresh - Should fail with a 401 Unauthorized error after logout", async () => {
      // Arrange
      await agent
        .post("/api/auth/company/login")
        .send({ email: adminEmail, password: adminPassword });
      await agent.post("/api/auth/logout").send();

      // Act
      const response = await agent.post("/api/auth/refresh").send();

      // Assert
      expect(response.status).toBe(401);
    });
  });
});
