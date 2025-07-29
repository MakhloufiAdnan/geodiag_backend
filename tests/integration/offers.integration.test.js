/**
 * @file Tests d'intégration pour les routes /api/offers.
 */
import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { pool } from '../../src/db/index.js';
import { createTestCompany, createTestUser } from '../helpers/testFactories.js';
import { setupIntegrationTest } from '../helpers/integrationTestSetup.js';
import redisClient from '../../src/config/redisClient.js';

describe('GET /api/offers', () => {
  const getAgent = setupIntegrationTest();
  let agent;
  let adminToken, technicianToken;

  beforeEach(async () => {
    agent = getAgent();
    await Promise.all([
      pool.query(
        'TRUNCATE TABLE companies, users, offers RESTART IDENTITY CASCADE'
      ),
      redisClient.flushall(),
    ]);

    const companyId = await createTestCompany(
      'Offer Test Co',
      'offer-co@test.com'
    );
    const admin = await createTestUser(
      companyId,
      'admin',
      'admin.offer@test.com'
    );
    adminToken = admin.token;
    const tech = await createTestUser(
      companyId,
      'technician',
      'tech.offer@test.com'
    );
    technicianToken = tech.token;
    await pool.query(
      "INSERT INTO offers (name, price, duration_months) VALUES ('Offre Test', 99.99, 12)"
    );
  });

  afterAll(async () => {
    await pool.end();
    await redisClient.quit();
  });

  it('retourne la liste des offres pour un admin (200 OK)', async () => {
    // Arrange : Le token de l'admin et les offres sont prêts.

    // Act
    const response = await agent
      .get('/api/offers')
      .set('Authorization', `Bearer ${adminToken}`);

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it("refuse l'accès pour un technicien (403 Forbidden)", async () => {
    // Arrange : Le token du technicien est prêt.

    // Act
    const response = await agent
      .get('/api/offers')
      .set('Authorization', `Bearer ${technicianToken}`);

    // Assert
    expect(response.statusCode).toBe(403);
  });
});
