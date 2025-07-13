import request from 'supertest';
import express from 'express';
import { pool } from '../../src/db/index.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import registrationRoutes from '../../src/routes/registrationRoutes.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const app = express();
app.use(express.json());
app.use('/api', registrationRoutes);
app.use(errorHandler);

describe("Tests d'intégration pour /api/register", () => {
    afterAll(async () => {
        // Nettoie les données créées par ce fichier de test
        await pool.query("DELETE FROM users WHERE email LIKE '%@register-test.com'");
        await pool.query("DELETE FROM companies WHERE email LIKE '%@register-test.com'");
        await pool.end();
    });

    it('POST /register/company - Doit créer une compagnie et un admin, et renvoyer un token (201)', async () => {
        const newRegistration = {
            companyData: { name: "Register Co", email: "co@register-test.com" },
            adminData: { email: "admin@register-test.com", password: "password123", first_name: "Reg", last_name: "Ister" }
        };
        const res = await request(app).post('/api/register/company').send(newRegistration);
        
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('token');
    });

    it("POST /register/company - Doit refuser si l'email existe déjà (409)", async () => {
        // Cet utilisateur a été créé dans le test précédent
        const existingRegistration = {
            companyData: { name: "Existing Co", email: "co@register-test.com" }, 
            adminData: { 
                email: "another-admin@register-test.com", 
                password: "password123",
                first_name: "Another",
                last_name: "Admin"
            }
        };
        const res = await request(app).post('/api/register/company').send(existingRegistration);
        
        expect(res.statusCode).toBe(409);
    });
});
