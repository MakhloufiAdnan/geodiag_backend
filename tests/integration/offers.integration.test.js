import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';

// --- Import des modules de l'application ---
import { pool } from '../../src/db/index.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { generateToken } from '../../src/utils/jwtUtils.js';
import offerRoutes from '../../src/routes/offerRoutes.js';

/**
 * @file Tests d'intégration pour les routes /api/offers
 * @description Valide la sécurité et le comportement des routes des offres.
 */

// -----------------------------------------------------------------------------
// -- MISE EN PLACE DE L'ENVIRONNEMENT DE TEST
// -----------------------------------------------------------------------------
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'un-secret-fiable-pour-les-tests';

const app = express();
app.use(express.json());
app.use('/api', offerRoutes);
app.use(errorHandler);

// -----------------------------------------------------------------------------
// -- SUITE DE TESTS PRINCIPALE
// -----------------------------------------------------------------------------

describe("Tests d'intégration pour /api/offers", () => {
    let adminToken;
    let technicianToken;

    beforeAll(async () => {
        // 1. Créer une compagnie et des utilisateurs de test
        const companyRes = await pool.query("INSERT INTO companies (name, email) VALUES ('Offer Test Co', 'offer-co@test.com') RETURNING company_id");
        const companyId = companyRes.rows[0].company_id;

        const adminPassword = await bcrypt.hash('password123', 10);
        const adminRes = await pool.query(
            "INSERT INTO users (company_id, email, password_hash, role) VALUES ($1, 'offer.admin@test.com', $2, 'admin') RETURNING *",
            [companyId, adminPassword]
        );
        adminToken = generateToken({ userId: adminRes.rows[0].user_id, companyId, role: 'admin' });

        const techPassword = await bcrypt.hash('password123', 10);
        const techRes = await pool.query(
            "INSERT INTO users (company_id, email, password_hash, role) VALUES ($1, 'offer.tech@test.com', $2, 'technician') RETURNING *",
            [companyId, techPassword]
        );
        technicianToken = generateToken({ userId: techRes.rows[0].user_id, companyId, role: 'technician' });

        // 2. Créer une offre de test
        await pool.query("INSERT INTO offers (name, price, duration_months) VALUES ('Offre Test', 99.99, 12)");
    });

    afterAll(async () => {
        // Nettoyer la base de données
        await pool.query('DELETE FROM users WHERE email LIKE \'offer.%\'');
        await pool.query('DELETE FROM companies WHERE email = \'offer-co@test.com\'');
        await pool.query('DELETE FROM offers WHERE name = \'Offre Test\'');
        await pool.end();
    });

    // -- TESTS POUR GET /api/offers --
    describe('GET /api/offers', () => {
        it('Doit retourner la liste des offres si l\'utilisateur est un admin (200)', async () => {
            // Préparation (Arrange) - Aucune préparation spécifique nécessaire ici.

            // Action (Act)
            const res = await request(app)
                .get('/api/offers')
                .set('Authorization', `Bearer ${adminToken}`);

            // Assertion (Assert)
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });

        it('Doit refuser l\'accès si l\'utilisateur est un technicien (403)', async () => {
            // Préparation (Arrange) - Aucune.

            // Action (Act)
            const res = await request(app)
                .get('/api/offers')
                .set('Authorization', `Bearer ${technicianToken}`);
            
            // Assertion (Assert)
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe('Accès refusé. Droits administrateur requis.');
        });

        it('Doit refuser l\'accès sans token (401)', async () => {
            // Préparation (Arrange) - Aucune.

            // Action (Act)
            const res = await request(app).get('/api/offers');

            // Assertion (Assert)
            expect(res.statusCode).toBe(401);
        });
    });
});