import { Router } from 'express';
import companyController from '../controllers/companyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateCompanyCreation, validateCompanyId } from '../validators/companyValidator.js';
import { authorize } from '../middleware/authorizationMiddleware.js';

/**
 * @file Définit les routes pour la gestion des compagnies.
 * @description Toutes les routes sont protégées et nécessitent une authentification.
 * La logique d'autorisation (rôle admin) est gérée dans le service.
 */
const router = Router();

// Note : La création de compagnie se fait via /register. Cette route serait
// utilisée si un super-admin pouvait créer des compagnies manuellement.
router.post('/companies', protect, validateCompanyCreation, companyController.createCompany);

router.get('/companies', protect, authorize('admin'), companyController.getAllCompanies);

// Valide que l'ID dans l'URL est un UUID valide avant de chercher la compagnie
router.get('/companies/:id', protect, authorize('admin'), validateCompanyId, companyController.getCompanyById);

export default router;