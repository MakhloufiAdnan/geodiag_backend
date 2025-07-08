import { Router } from 'express';
import authController from '../controllers/authController.js';
import { validateLogin } from '../validators/authValidator.js';

/**
 * @file Définit les routes pour l'authentification.
 * @description Ces routes sont publiques mais valident les données d'entrée
 * avant d'appeler le contrôleur d'authentification.
 */
const router = Router();

// Valide le corps de la requête, puis tente de connecter l'admin
router.post('/auth/company/login', validateLogin, authController.loginCompany);

// Valide le corps de la requête, puis tente de connecter le technicien
router.post('/auth/technician/login', validateLogin, authController.loginTechnician);

export default router;