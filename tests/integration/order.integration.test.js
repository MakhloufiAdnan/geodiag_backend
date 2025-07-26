/**
 * @file Tests d'intégration pour le flux de commande (/api/orders).
 */
import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { pool } from '../../src/db/index.js';
import { createTestCompany, createTestUser } from '../helpers/testFactories.js';
import { setupIntegrationTest } from '../helpers/integrationTestSetup.js';
import redisClient from '../../src/config/redisClient.js';

describe('/api/orders', () => {
    const getAgent = setupIntegrationTest();
    let agent;
    let adminToken, technicianToken, testOfferId;

    beforeEach(async () => {
        agent = getAgent();
        await Promise.all([
            pool.query('TRUNCATE TABLE companies, users, offers, orders RESTART IDENTITY CASCADE'),
            redisClient.flushall()
        ]);
        
        const companyId = await createTestCompany('Order Test Co', 'order-co@test.com');
        const admin = await createTestUser(companyId, 'admin', 'admin.order@test.com');
        adminToken = admin.token;
        const tech = await createTestUser(companyId, 'technician', 'tech.order@test.com');
        technicianToken = tech.token;
        const offerRes = await pool.query("INSERT INTO offers (name, price, duration_months) VALUES ('Order Offer', 199.99, 12) RETURNING offer_id");
        testOfferId = offerRes.rows[0].offer_id;
    });

    afterAll(async () => {
        await pool.end();
        await redisClient.quit();
    });

    describe('POST /api/orders', () => {
        it('crée une nouvelle commande pour un admin (201 Created)', async () => {
            // Arrange
            const orderPayload = { offerId: testOfferId };

            // Act
            const response = await agent
                .post('/api/orders')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(orderPayload);

            // Assert
            expect(response.statusCode).toBe(201);
            expect(response.body.offerId).toBe(testOfferId);
            expect(response.body.status).toBe('pending');
        });

        it('refuse la création d\'une commande pour un technicien (403 Forbidden)', async () => {
            // Arrange
            const orderPayload = { offerId: testOfferId };

            // Act
            const response = await agent
                .post('/api/orders')
                .set('Authorization', `Bearer ${technicianToken}`)
                .send(orderPayload);

            // Assert
            expect(response.statusCode).toBe(403);
        });
    });
});