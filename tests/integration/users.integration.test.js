import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { pool } from '../../src/db/index.js';
import redisClient from '../../src/config/redisClient.js';
import { createTestCompany, createTestUser } from '../helpers/testFactories.js';

/**
 * @file Tests d'intégration pour les routes de gestion des utilisateurs (/api/users).
 * @see L'application de test est initialisée globalement dans jest.setup.js et accessible via `global.testApp`.
 */
describe('/api/users', () => {
    let adminToken, technicianToken, technicianId;

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
        
        const testCompanyId = await createTestCompany('User Test Co', 'user-co@test.com');
        const admin = await createTestUser(testCompanyId, 'admin', 'admin.user@test.com');
        adminToken = admin.token;
        const tech = await createTestUser(testCompanyId, 'technician', 'tech.user@test.com');
        technicianToken = tech.token;
        technicianId = tech.userId;
    });

    /**
     * @description Ferme le serveur à la fin des tests.
     */
    afterAll(async () => {

        // Fermer le pool de connexions à la base de données
        await pool.end();
    });

    describe('GET /api/users', () => {
        
        /**
         * @description Vérifie qu'un admin peut obtenir la liste de tous les utilisateurs.
         */
        it('retourne la liste paginée des utilisateurs pour un admin (200 OK)', async () => {

            // Arrange : Token admin prêt.
            // Act
            const response = await request(global.testApp)
                .get('/api/users')
                .set('Authorization', `Bearer ${adminToken}`);
            
            // Assert
            expect(response.statusCode).toBe(200);
            expect(response.body.data.length).toBeGreaterThanOrEqual(2);
            expect(response.body).toHaveProperty('meta');
        });

        /**
         * @description Vérifie qu'un utilisateur non-admin (technicien) ne peut pas lister les utilisateurs.
         */
        it('refuse l\'accès à la liste pour un non-admin (403 Forbidden)', async () => {

            // Arrange : Token technicien prêt.
            // Act
            const response = await request(global.testApp)
                .get('/api/users')
                .set('Authorization', `Bearer ${technicianToken}`);
            
            // Assert
            expect(response.statusCode).toBe(403);
        });
    });

    describe('GET /api/users/:id', () => {

        /**
         * @description Vérifie qu'un utilisateur peut consulter son propre profil.
         */
        it('autorise un technicien à voir son propre profil (200 OK)', async () => {
            // Arrange : ID et token du technicien sont prêts.
            // Act
            const response = await request(global.testApp)
                .get(`/api/users/${technicianId}`)
                .set('Authorization', `Bearer ${technicianToken}`);

            // Assert
            expect(response.statusCode).toBe(200);
            expect(response.body.userId).toBe(technicianId);
        });
    });
});
