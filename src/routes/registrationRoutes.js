import { Router } from 'express';
import registrationController from '../controllers/registrationController.js';
import { validateRegister } from '../validators/registrationValidator.js';

/**
 * @file Définit la route pour l'inscription d'une nouvelle compagnie.
 */
const router = Router();

// Route publique, mais avec une validation stricte des données d'entrée.
router.post('/register/company', validateRegister, registrationController.registerCompany);

export default router;