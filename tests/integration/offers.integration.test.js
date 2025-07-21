import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { pool } from '../../src/db/index.js';
import { createTestCompany, createTestUser } from '../helpers/testFactories.js';
import redisClient from '../../src/config/redisClient.js'; 

/**
 * @file Tests d'intégration pour les routes /api/offers.
 * @description Valide l'accès et les règles d'autorisation sur les offres.
 * @see L'application de test est initialisée globalement dans jest.setup.js et accessible via `global.testApp`.
 */
describe('GET /api/offers', () => {
    let adminToken, technicianToken;

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
    
        const companyId = await createTestCompany('Offer Test Co', 'offer-co@test.com');
        const admin = await createTestUser(companyId, 'admin', 'admin.offer@test.com');
        adminToken = admin.token;
        const tech = await createTestUser(companyId, 'technician', 'tech.offer@test.com');
        technicianToken = tech.token;
        await pool.query("INSERT INTO offers (name, price, duration_months) VALUES ('Offre Test', 99.99, 12)");
    });

    /**
     * @description Ferme le serveur à la fin des tests.
     */
    afterAll(async () => {

        // Fermer le pool de connexions à la base de données
        await pool.end();
    });

    /**
     * @description Teste si un admin peut lister toutes les offres disponibles.
     */
    it('retourne la liste des offres pour un admin (200 OK)', async () => {

        // Arrange : Le token de l'admin et les offres sont prêts.
        // Act
        const response = await request(global.testApp)
            .get('/api/offers')
            .set('Authorization', `Bearer ${adminToken}`);
        
        // Assert
        expect(response.statusCode).toBe(200);
        expect(response.body.length).toBeGreaterThan(0);
    });

    /**
     * @description Teste si un technicien ne peut pas accéder à la liste des offres.
     */
    it('refuse l\'accès pour un technicien (403 Forbidden)', async () => {

        // Arrange : Le token du technicien est prêt.
        // Act
        const response = await request(global.testApp)
            .get('/api/offers')
            .set('Authorization', `Bearer ${technicianToken}`);

        // Assert
        expect(response.statusCode).toBe(403);
    });
});
