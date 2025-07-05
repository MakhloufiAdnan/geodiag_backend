import { Router } from 'express';
import companyController from '../controllers/companyController.js';
import { protect } from '../middleware/authMiddleware.js';

// Importer les middlewares de validation pré-configurés.
import {
    validateCompanyCreation,
    validateCompanyId 
} from '../validators/companyValidator.js';

const router = Router();

// Route de création avec validation du corps de la requête.
router.post('/companies', protect, validateCompanyCreation, companyController.createCompany);

// Route générale
router.get('/companies', protect, companyController.getAllCompanies);

// Route spécifique avec validation de l'ID dans les paramètres de l'URL.
router.get('/companies/:id', protect, validateCompanyId, companyController.getCompanyById);

export default router;