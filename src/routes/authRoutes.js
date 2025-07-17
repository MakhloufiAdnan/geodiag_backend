import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import authController from '../controllers/authController.js';
import { validateLogin } from '../validators/authValidator.js';

/**
 * @file Définit les routes pour l'authentification.
 * @description Ces routes sont publiques mais valident les données d'entrée
 * avant d'appeler le contrôleur d'authentification.
 */
const router = Router();

// Créer un limiteur : 20 requêtes toutes les 15 minutes par IP
const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 20, 
	message: 'Trop de tentatives de connexion depuis cette IP, veuillez réessayer dans 15 minutes.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Valide le corps de la requête, puis tente de connecter l'admin
router.post('/auth/company/login', loginLimiter, validateLogin, authController.loginCompany);

// Valide le corps de la requête, puis tente de connecter le technicien
router.post('/auth/technician/login', loginLimiter, validateLogin, authController.loginTechnician);

export default router;