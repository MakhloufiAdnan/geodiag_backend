import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { pool } from '../../src/db/index.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { generateToken } from '../../src/utils/jwtUtils.js';
import userRoutes from '../../src/routes/userRoutes.js';

/**
 * @file Tests d'intégration pour les routes /api/users
 * @description Cette suite de tests valide le comportement complet du CRUD pour les utilisateurs,
 * en incluant la sécurité, la validation des données et la gestion des rôles.
 */

// S'assurer que l'environnement est bien 'test'
process.env.NODE_ENV = 'test';

// Définir un secret JWT de test cohérent
process.env.JWT_SECRET = 'un-secret-fiable-pour-les-tests';

// Création d'une instance d'application Express dédiée aux tests
const app = express();
app.use(express.json());

// Monte uniquement les routes à tester
app.use('/api', userRoutes);

// Ajoute le gestionnaire d'erreurs pour tester les cas d'erreur
app.use(errorHandler);

describe("Tests d'intégration pour /api/users", () => {

    // -- Variables partagées par les tests --
    let testCompanyId;
    let adminToken;      // Token pour un utilisateur avec le rôle 'admin'
    let technicianToken; // Token pour un utilisateur avec le rôle 'technician'
    let adminUserId;

    /**
     * Le hook `beforeAll` s'exécute une seule fois avant tous les tests.
     */
    beforeAll(async () => {

        // 1. Créer une compagnie de test
        const companyRes = await pool.query("INSERT INTO companies (name, email) VALUES ('Test Company', 'company@test.com') RETURNING company_id");
        testCompanyId = companyRes.rows[0].company_id;

        // 2. Créer un utilisateur ADMIN et son token
        const adminPassword = await bcrypt.hash('password123', 10);
        const adminRes = await pool.query(
            "INSERT INTO users (company_id, email, password_hash, first_name, role) VALUES ($1, 'admin@test.com', $2, 'Admin', 'admin') RETURNING *",
            [testCompanyId, adminPassword]
        );
        adminUserId = adminRes.rows[0].user_id;
        adminToken = generateToken({ userId: adminRes.rows[0].user_id, companyId: testCompanyId, role: 'admin' });

        // 3. Créer un utilisateur TECHNICIAN et son token
        const techPassword = await bcrypt.hash('password123', 10);
        const techRes = await pool.query(
            "INSERT INTO users (company_id, email, password_hash, first_name, role) VALUES ($1, 'tech@test.com', $2, 'Tech', 'technician') RETURNING *",
            [testCompanyId, techPassword]
        );
        technicianToken = generateToken({ userId: techRes.rows[0].user_id, companyId: testCompanyId, role: 'technician' });
    });

    /**
     * Le hook `afterAll` s'exécute une seule fois après tous les tests.
     */
    afterAll(async () => {
        
        // Nettoie les tables dans l'ordre inverse des dépendances (users dépend de companies)
        await pool.query('DELETE FROM users');
        await pool.query('DELETE FROM companies');

        // Ferme la connexion à la base de données pour permettre à Jest de se terminer proprement.
        await pool.end();
    });

    // -- TESTS POUR LA CRÉATION (POST /users) --
    describe('POST /users', () => {
        it("Doit créer un utilisateur si l'utilisateur authentifié est un admin (201)", async () => {
            const newUser = {
                email: 'new.user@test.com', password: 'password123', first_name: 'John',
                last_name: 'Smith', role: 'technician', company_id: testCompanyId
            };
            const res = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newUser);
            expect(res.statusCode).toBe(201);
            expect(res.body.email).toBe(newUser.email);
        });

        it("Doit refuser la création si l'utilisateur authentifié est un technicien (403)", async () => {
            const newUser = {
                email: 'another.user@test.com', password: 'password123', first_name: 'Peter',
                last_name: 'Pan', role: 'technician', company_id: testCompanyId
            };
            const res = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${technicianToken}`) // Token de technicien
                .send(newUser);
            expect(res.statusCode).toBe(403); // Forbidden
        });
        
        it('Doit refuser la création si des données sont invalides (400)', async () => {
            const invalidUser = { email: 'bademail', password: '123' }; // Email invalide, mdp trop court
            const res = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidUser);
            expect(res.statusCode).toBe(400); // Bad Request
        });
    });
    
    // -- TESTS POUR LA LECTURE (GET /users, GET /users/:id) --
    describe('GET /users', () => {
        it('Doit retourner la liste des utilisateurs si authentifié (200)', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('Doit retourner un utilisateur par son ID si authentifié (200)', async () => {
            const res = await request(app)
                .get(`/api/users/${adminUserId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.userId).toBe(adminUserId);
        });

        it("Doit retourner une erreur si l'ID n'existe pas (404)", async () => {
            const nonExistentId = uuidv4();
            const res = await request(app)
                .get(`/api/users/${nonExistentId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(404);
        });

        it("Doit refuser l'accès sans token (401)", async () => {
            const res = await request(app).get('/api/users');
            expect(res.statusCode).toBe(401);
        });
    });
});
