import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { pool } from '../../src/db/index.js';
import { createTestCompany, createTestUser } from '../helpers/testFactories.js';
import redisClient from '../../src/config/redisClient.js'; 

/**
 * @file Tests d'intégration pour les routes /api/companies.
 * @description Valide la récupération et la protection des routes des compagnies.
 * @see L'application de test est initialisée globalement dans jest.setup.js et accessible via `global.testApp`.
 */
describe('GET /api/companies', () => {
    let adminToken, technicianToken, testCompanyId;

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
    
        testCompanyId = await createTestCompany('Company Integ Test', 'co-integ@test.com');
        const admin = await createTestUser(testCompanyId, 'admin', 'admin.co@test.com');
        adminToken = admin.token;
        const tech = await createTestUser(testCompanyId, 'technician', 'tech.co@test.com');
        technicianToken = tech.token;
    });

    /**
     * @description Ferme le serveur à la fin des tests.
     */
    afterAll(async () => {

        // Fermer le pool de connexions à la base de données
        await pool.end();
    });

    /**
     * @description Teste si un admin peut récupérer la liste paginée des compagnies.
     */
    it('retourne la liste des compagnies pour un admin (200 OK)', async () => {

        // Arrange : Les données sont prêtes grâce à beforeEach.
        // Act : Exécuter la requête API.
        const response = await request(global.testApp)
            .get('/api/companies')
            .set('Authorization', `Bearer ${adminToken}`);

        // Assert : Vérifier les résultats.
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('meta');
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    /**
     * @description Teste si un technicien est bien bloqué lors de l'accès à la liste des compagnies.
     */
    it('refuse l\'accès à la liste des compagnies pour un technicien (403 Forbidden)', async () => {

        // Arrange : Le token du technicien est prêt.
        // Act
        const response = await request(global.testApp)
            .get('/api/companies')
            .set('Authorization', `Bearer ${technicianToken}`);

        // Assert
        expect(response.statusCode).toBe(403);
    });

    /**
     * @description Teste si un admin peut récupérer les détails d'une compagnie par son ID.
     */
    it('retourne les détails d\'une compagnie par son ID pour un admin (200 OK)', async () => {

        // Arrange : L'ID de la compagnie est disponible.
        // Act
        const response = await request(global.testApp)
            .get(`/api/companies/${testCompanyId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        // Assert
        expect(response.statusCode).toBe(200);
        expect(response.body.companyId).toBe(testCompanyId);
    });
});
