import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';

import { pool } from '../../src/db/index.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { generateToken } from '../../src/utils/jwtUtils.js';
import offerRoutes from '../../src/routes/offerRoutes.js';

// Configuration de l'environnement de test
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'un-secret-fiable-pour-les-tests';

const app = express();
app.use(express.json());
app.use('/api', offerRoutes);
app.use(errorHandler);

describe("Tests d'intégration pour /api/offers", () => {

    let adminToken;
    let technicianToken;

    beforeAll(async () => {
        // 1. Créer une compagnie et des utilisateurs de test
        const companyRes = await pool.query("INSERT INTO companies (name, email) VALUES ('Offer Test Co', 'offer-co@test.com') RETURNING company_id");
        const companyId = companyRes.rows[0].company_id;

        const adminPassword = await bcrypt.hash('password123', 10);
        const adminRes = await pool.query("INSERT INTO users (company_id, email, password_hash, role) VALUES ($1, 'admin.offer@test.com', $2, 'admin') RETURNING user_id", [companyId, adminPassword]);
        adminToken = generateToken({ userId: adminRes.rows[0].user_id, companyId: companyId, role: 'admin' });

        const techPassword = await bcrypt.hash('password123', 10);
        const techRes = await pool.query("INSERT INTO users (company_id, email, password_hash, role) VALUES ($1, 'tech.offer@test.com', $2, 'technician') RETURNING user_id", [companyId, techPassword]);
        technicianToken = generateToken({ userId: techRes.rows[0].user_id, companyId: companyId, role: 'technician' });

        // 2. Créer une offre de test
        await pool.query("INSERT INTO offers (name, price, duration_months) VALUES ('Offre Test', 99.99, 12)");
    });

    afterAll(async () => {
        // Nettoyer la base de données
        await pool.query("DELETE FROM users WHERE email LIKE '%.offer@test.com'");
        await pool.query("DELETE FROM companies WHERE email = 'offer-co@test.com'");
        await pool.query("DELETE FROM offers WHERE name = 'Offre Test'");
        await pool.end();
    });

    describe('GET /api/offers', () => {
        it("Doit retourner la liste des offres si l'utilisateur est un admin (200)", async () => {
            const res = await request(app)
                .get('/api/offers')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
        });

        it("Doit refuser l'accès si l'utilisateur est un technicien (403)", async () => {
            const res = await request(app)
                .get('/api/offers')
                .set('Authorization', `Bearer ${technicianToken}`);

            expect(res.statusCode).toBe(403);
        });

        it("Doit refuser l'accès sans token (401)", async () => {
            const res = await request(app).get('/api/offers');
            expect(res.statusCode).toBe(401);
        });
    });
});
