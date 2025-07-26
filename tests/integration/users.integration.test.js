/**
 * @file Tests d'intégration pour les routes de gestion des utilisateurs (/api/users).
 */
import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { pool } from '../../src/db/index.js';
import { createTestCompany, createTestUser } from '../helpers/testFactories.js';
import { setupIntegrationTest } from '../helpers/integrationTestSetup.js';
import redisClient from '../../src/config/redisClient.js';

describe('/api/users', () => {
    const getAgent = setupIntegrationTest();
    let agent;
    let adminToken, technicianToken, technicianId;

    beforeEach(async () => {
        agent = getAgent();
        await Promise.all([
            pool.query('TRUNCATE TABLE companies, users RESTART IDENTITY CASCADE'),
            redisClient.flushall()
        ]);
        
        const testCompanyId = await createTestCompany('User Test Co', 'user-co@test.com');
        const admin = await createTestUser(testCompanyId, 'admin', 'admin.user@test.com');
        adminToken = admin.token;
        const tech = await createTestUser(testCompanyId, 'technician', 'tech.user@test.com');
        technicianToken = tech.token;
        technicianId = tech.userId;
    });

    afterAll(async () => {
        await pool.end();
        await redisClient.quit();
    });

    describe('GET /api/users', () => {
        it('retourne la liste paginée des utilisateurs pour un admin (200 OK)', async () => {
            // Arrange : Token admin prêt.
            
            // Act
            const response = await agent
                .get('/api/users')
                .set('Authorization', `Bearer ${adminToken}`);
            
            // Assert
            expect(response.statusCode).toBe(200);
            expect(response.body.data.length).toBeGreaterThanOrEqual(2);
            expect(response.body).toHaveProperty('meta');
        });

        it('refuse l\'accès à la liste pour un non-admin (403 Forbidden)', async () => {
            // Arrange : Token technicien prêt.

            // Act
            const response = await agent
                .get('/api/users')
                .set('Authorization', `Bearer ${technicianToken}`);
            
            // Assert
            expect(response.statusCode).toBe(403);
        });
    });

    describe('GET /api/users/:id', () => {
        it('autorise un technicien à voir son propre profil (200 OK)', async () => {
            // Arrange : ID et token du technicien sont prêts.

            // Act
            const response = await agent
                .get(`/api/users/${technicianId}`)
                .set('Authorization', `Bearer ${technicianToken}`);

            // Assert
            expect(response.statusCode).toBe(200);
            expect(response.body.userId).toBe(technicianId);
        });
    });
});