import { Router } from 'express';
import registrationController from '../controllers/registrationController.js';

// Importer uniquement le middleware de validation pré-configuré.
import { validateRegister } from '../validators/registrationValidator.js';

const router = Router();

// Appliquer le middleware de validation à la route d'inscription.
router.post('/register/company', validateRegister, registrationController.registerCompany);

export default router;