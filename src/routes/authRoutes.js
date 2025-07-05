import { Router } from 'express';
import authController from '../controllers/authController.js';

// Importer uniquement le middleware pré-configuré
import { validateLogin } from '../validators/authValidator.js';

const router = Router();

// Utiliser directement le middleware.
router.post('/auth/company/login', validateLogin, authController.loginCompany);
router.post('/auth/technician/login', validateLogin, authController.loginTechnician);

export default router;