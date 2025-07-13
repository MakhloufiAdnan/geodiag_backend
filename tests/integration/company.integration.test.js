import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';

import { pool } from '../../src/db/index.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { generateToken } from '../../src/utils/jwtUtils.js';
import companyRoutes from '../../src/routes/companyRoutes.js';

// Configuration de l'environnement de test
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'un-secret-fiable-pour-les-tests';

const app = express();
app.use(express.json());
app.use('/api', companyRoutes);
app.use(errorHandler);

describe("Tests d'intégration pour /api/companies", () => {

    let testCompanyId;
    let adminToken;
    let technicianToken;

    beforeAll(async () => {
        // 1. Créer une compagnie de test
        const companyRes = await pool.query("INSERT INTO companies (name, email) VALUES ('Company Integration Test', 'company-integ@test.com') RETURNING company_id");
        testCompanyId = companyRes.rows[0].company_id;

        // 2. Créer un utilisateur ADMIN et son token
        const adminPassword = await bcrypt.hash('password123', 10);
        const adminRes = await pool.query(
            "INSERT INTO users (company_id, email, password_hash, first_name, role) VALUES ($1, 'admin-company@test.com', $2, 'Admin', 'admin') RETURNING *",
            [testCompanyId, adminPassword]
        );
        adminToken = generateToken({ userId: adminRes.rows[0].user_id, companyId: testCompanyId, role: 'admin' });

        // 3. Créer un utilisateur TECHNICIAN et son token
        const techPassword = await bcrypt.hash('password123', 10);
        const techRes = await pool.query(
            "INSERT INTO users (company_id, email, password_hash, first_name, role) VALUES ($1, 'tech-company@test.com', $2, 'Tech', 'technician') RETURNING *",
            [testCompanyId, techPassword]
        );
        technicianToken = generateToken({ userId: techRes.rows[0].user_id, companyId: testCompanyId, role: 'technician' });
    });

    afterAll(async () => {
        // Nettoie les tables dans l'ordre inverse des dépendances
        await pool.query("DELETE FROM users WHERE email LIKE '%-company@test.com'");
        await pool.query("DELETE FROM companies WHERE email = 'company-integ@test.com'");
        
        // Ferme la connexion à la base de données
        await pool.end();
    });

    describe('GET /companies', () => {
        it("Doit retourner la liste des compagnies si l'utilisateur est un admin (200)", async () => {
            const res = await request(app)
                .get('/api/companies')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it("Doit refuser l'accès si l'utilisateur est un technicien (403)", async () => {
            const res = await request(app)
                .get('/api/companies')
                .set('Authorization', `Bearer ${technicianToken}`);
            
            expect(res.statusCode).toBe(403);
        });

        it("Doit retourner une compagnie par son ID si l'utilisateur est un admin (200)", async () => {
            const res = await request(app)
                .get(`/api/companies/${testCompanyId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.companyId).toBe(testCompanyId);
        });
    });
});
