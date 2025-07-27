import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import { pool } from "../../src/db/index.js";
import { createTestCompany, createTestUser } from "../helpers/testFactories.js";
import { setupIntegrationTest } from "../helpers/integrationTestSetup.js";
import redisClient from "../../src/config/redisClient.js";

/**
 * @file Tests d'intégration pour les routes /api/companies.
 */
describe("GET /api/companies", () => {
  const getAgent = setupIntegrationTest();
  let agent;
  let adminToken, technicianToken, testCompanyId;

  beforeEach(async () => {
    agent = getAgent();
    await Promise.all([
      pool.query("TRUNCATE TABLE companies, users RESTART IDENTITY CASCADE"),
      redisClient.flushall(),
    ]);

    testCompanyId = await createTestCompany(
      "Company Integ Test",
      "co-integ@test.com"
    );
    const admin = await createTestUser(
      testCompanyId,
      "admin",
      "admin.co@test.com"
    );
    adminToken = admin.token;
    const tech = await createTestUser(
      testCompanyId,
      "technician",
      "tech.co@test.com"
    );
    technicianToken = tech.token;
  });

  afterAll(async () => {
    await pool.end();
    await redisClient.quit();
  });

  it("retourne la liste des compagnies pour un admin (200 OK)", async () => {
    // Arrange
    // Les données sont prêtes grâce à beforeEach.

    // Act
    const response = await agent
      .get("/api/companies")
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("data");
    // CORRECTION : Vérifier la présence de "metadata" au lieu de "meta".
    expect(response.body).toHaveProperty("metadata");
  });

  it("refuse l'accès à la liste des compagnies pour un technicien (403 Forbidden)", async () => {
    // Act
    const response = await agent
      .get("/api/companies")
      .set("Authorization", `Bearer ${technicianToken}`);

    // Assert
    expect(response.statusCode).toBe(403);
  });

  it("retourne les détails d'une compagnie par son ID pour un admin (200 OK)", async () => {
    // Act
    const response = await agent
      .get(`/api/companies/${testCompanyId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.body.companyId).toBe(testCompanyId);
  });
});
