/**
 * @file Tests d'intégration pour le flux d'inscription (/api/register).
 */
import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { pool } from '../../src/db/index.js';
import { setupIntegrationTest } from '../helpers/integrationTestSetup.js';
import redisClient from '../../src/config/redisClient.js';

describe('POST /api/register/company', () => {
  const getAgent = setupIntegrationTest();
  let agent;

  beforeEach(async () => {
    agent = getAgent();
    await Promise.all([
      pool.query('TRUNCATE TABLE companies, users RESTART IDENTITY CASCADE'),
      redisClient.flushall(),
    ]);
  });

  afterAll(async () => {
    await pool.end();
    await redisClient.quit();
  });

  it('crée une compagnie et un admin, et retourne un token (201 Created)', async () => {
    // Arrange
    const newRegistration = {
      companyData: { name: 'Register Co', email: 'co@register-test.com' },
      adminData: {
        email: 'admin@register-test.com',
        password: 'password123',
        first_name: 'Reg',
        last_name: 'Ister',
      },
    };

    // Act
    const response = await agent
      .post('/api/register/company')
      .send(newRegistration);

    // Assert
    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('accessToken');
  });

  it("refuse l'inscription si l'email de la compagnie existe déjà (409 Conflict)", async () => {
    // Arrange : Créer une première compagnie pour occuper l'email.
    const firstRegistration = {
      companyData: { name: 'Existing Co', email: 'co@conflict.com' },
      adminData: {
        email: 'admin1@conflict.com',
        password: 'password123',
        first_name: 'Admin',
        last_name: 'One',
      },
    };
    await agent.post('/api/register/company').send(firstRegistration);

    const conflictingRegistration = {
      companyData: { name: 'Another Co', email: 'co@conflict.com' }, // <-- Email en conflit
      adminData: {
        email: 'admin2@conflict.com',
        password: 'password123',
        first_name: 'Admin',
        last_name: 'Two',
      },
    };

    // Act : Tenter d'enregistrer la deuxième compagnie.
    const response = await agent
      .post('/api/register/company')
      .send(conflictingRegistration);

    // Assert
    expect(response.statusCode).toBe(409);
  });
});
