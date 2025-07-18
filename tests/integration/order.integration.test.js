import { describe, it, expect, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { pool } from '../../src/db/index.js';
import { createTestApp } from '../helpers/app.js';
import { generateToken } from '../../src/utils/jwtUtils.js';

/**
 * @file Tests d'intégration pour le flux de commande.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-integration';

const app = createTestApp();

describe("Tests d'intégration pour /api/orders", () => {
    let adminToken, technicianToken, testOfferId;

    beforeEach(async () => {
        await pool.query('TRUNCATE TABLE companies, users, offers, orders RESTART IDENTITY CASCADE');
        
        const companyRes = await pool.query("INSERT INTO companies (name, email) VALUES ('Order Test Co', 'order-co@test.com') RETURNING company_id");
        const companyId = companyRes.rows[0].company_id;

        const adminPassword = await bcrypt.hash('password123', 10);
        const adminRes = await pool.query("INSERT INTO users (company_id, email, password_hash, role) VALUES ($1, 'admin.order@test.com', $2, 'admin') RETURNING user_id", [companyId, adminPassword]);
        adminToken = generateToken({ userId: adminRes.rows[0].user_id, companyId: companyId, role: 'admin' });
        
        const techPassword = await bcrypt.hash('password123', 10);
        const techRes = await pool.query("INSERT INTO users (company_id, email, password_hash, role) VALUES ($1, 'tech.order@test.com', $2, 'technician') RETURNING user_id", [companyId, techPassword]);
        technicianToken = generateToken({ userId: techRes.rows[0].user_id, companyId: companyId, role: 'technician' });

        const offerRes = await pool.query("INSERT INTO offers (name, price, duration_months) VALUES ('Order Offer', 199.99, 12) RETURNING offer_id");
        testOfferId = offerRes.rows[0].offer_id;
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('POST /api/orders', () => {
        it("Doit autoriser un admin à créer une commande (201)", async () => {
            const res = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ offerId: testOfferId });

            expect(res.statusCode).toBe(201);
            expect(res.body.offerId).toBe(testOfferId);
            expect(res.body.status).toBe('pending');
        });

        it("Doit refuser à un technicien de créer une commande (403)", async () => {
            const res = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${technicianToken}`)
                .send({ offerId: testOfferId });
            
            expect(res.statusCode).toBe(403);
        });
    });
});