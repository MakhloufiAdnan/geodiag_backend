import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { pool } from '../../src/db/index.js';
import { createTestCompany, createTestUser } from '../helpers/testFactories.js';
import redisClient from '../../src/config/redisClient.js'; 

/**
 * @file Tests d'intégration pour le flux de commande (/api/orders).
 * @see L'application de test est initialisée globalement dans jest.setup.js et accessible via `global.testApp`.
 */
describe('/api/orders', () => {
    let adminToken, technicianToken, testOfferId;

    /**
     * @description Prépare la base de données avec des utilisateurs de test avant chaque test.
     * Nettoie PostgreSQL ET Redis pour garantir une isolation parfaite des tests.
     */
    beforeEach(async () => {

        // Nettoye les deux sources de données en parallèle
        await Promise.all([
            pool.query('TRUNCATE TABLE companies, users RESTART IDENTITY CASCADE'),
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

    /**
     * @description Ferme le serveur à la fin des tests.
     */
    afterAll(async () => {

        // Fermer le pool de connexions à la base de données
        await pool.end();
    });

    describe('POST /api/orders', () => {

        /**
         * @description Vérifie qu'un administrateur peut créer une nouvelle commande.
         */
        it('crée une nouvelle commande pour un admin (201 Created)', async () => {

            // Arrange
            const orderPayload = { offerId: testOfferId };

            // Act
            const response = await request(global.testApp)
                .post('/api/orders')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(orderPayload);

            // Assert
            expect(response.statusCode).toBe(201);
            expect(response.body.offerId).toBe(testOfferId);
            expect(response.body.status).toBe('pending');
        });

        /**
         * @description Vérifie qu'un utilisateur avec le rôle 'technician' ne peut pas créer de commande.
         */
        it('refuse la création d\'une commande pour un technicien (403 Forbidden)', async () => {
            
            // Arrange
            const orderPayload = { offerId: testOfferId };

            // Act
            const response = await request(global.testApp)
                .post('/api/orders')
                .set('Authorization', `Bearer ${technicianToken}`)
                .send(orderPayload);

            // Assert
            expect(response.statusCode).toBe(403);
        });
    });
});
