/**
 * @file Tests d'intégration pour la route publique GET /api/offers.
 * @description Valide que la route est accessible à tous les types d'utilisateurs
 * (admin, technicien, visiteur non authentifié) et renvoie les données attendues.
 */
import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { pool } from '../../src/db/index.js';
import { createTestCompany, createTestUser } from '../helpers/testFactories.js';
import { setupIntegrationTest } from '../helpers/integrationTestSetup.js';
import redisClient from '../../src/config/redisClient.js';

describe('GET /api/offers', () => {
  const getAgent = setupIntegrationTest();
  let agent;
  let adminToken;
  let technicianToken;

  beforeEach(async () => {
    // Arrange (Global) : Préparer un état propre avant chaque test.
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
      "INSERT INTO offers (name, price, duration_months, is_public) VALUES ('Offre Test', 99.99, 12, true)"
    );
  });

  afterAll(async () => {
    await pool.end();
    await redisClient.quit();
  });

  /**
   * @description Teste que la route est accessible pour un administrateur connecté.
   */
  it('retourne la liste des offres pour un admin (200 OK)', async () => {
    // Arrange : Le token de l'admin et les offres sont prêts grâce à beforeEach.

    // Act : Effectuer la requête avec le token de l'admin.
    const response = await agent
      .get('/api/offers')
      .set('Authorization', `Bearer ${adminToken}`);

    // Assert : Vérifier que la réponse est correcte.
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0].name).toBe('Offre Test');
  });

  /**
   * @description Teste que la route, devenue publique, est bien accessible pour un technicien.
   */
  it('retourne la liste des offres pour un technicien connecté (200 OK)', async () => {
    // Arrange : Le token du technicien est prêt.

    // Act : Effectuer la requête avec le token du technicien.
    const response = await agent
      .get('/api/offers')
      .set('Authorization', `Bearer ${technicianToken}`);

    // Assert : Vérifier que la réponse est 200 OK, car la route est désormais publique.
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
  });

  /**
   * @description Teste que la route est accessible pour un simple visiteur sans authentification.
   */
  it('retourne la liste des offres pour un visiteur non authentifié (200 OK)', async () => {
    // Arrange : Aucune authentification n'est nécessaire.

    // Act : Effectuer la requête sans jeton d'authentification.
    const response = await agent.get('/api/offers');

    // Assert : Vérifier que la réponse est 200 OK, confirmant que la route est publique.
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
  });
});
