import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import authController from '../controllers/authController.js';
import { validateLogin } from '../validators/authValidator.js';

/**
 * @file Définit les routes pour l'authentification (/api/auth).
 * @description Inclut la connexion, la déconnexion et le rafraîchissement des jetons.
 */
const router = Router();

// Créer un limiteur : 20 requêtes toutes les 15 minutes par IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: 'Trop de tentatives de connexion depuis cette IP, veuillez réessayer dans 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
});

// --- Routes de Connexion ---
router.post('/auth/company/login', loginLimiter, validateLogin, authController.loginCompany);
router.post('/auth/technician/login', loginLimiter, validateLogin, authController.loginTechnician);

// --- Route de Rafraîchissement de Jeton ---
// Pas de limiteur de débit agressif ici, car c'est une opération légitime et fréquente.
router.post('/auth/refresh', authController.refresh);

// --- Route de Déconnexion ---
router.post('/auth/logout', authController.logout);

export default router;