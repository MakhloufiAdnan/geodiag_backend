import { Router } from 'express';
import companyController from '../controllers/companyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authorizationMiddleware.js';
import { parsePagination } from '../middleware/paginationMiddleware.js';
import { validateCompanyCreation } from '../validators/companyValidator.js';
import { validateUuidParam } from '../validators/commonValidator.js';

/**
 * @file Définit les routes pour la gestion des compagnies.
 * @description Toutes les routes sont protégées et nécessitent une authentification.
 * La logique d'autorisation (rôle admin) est gérée dans le service.
 */
const router = Router();

// Note : La création de compagnie se fait via /register. Cette route serait
// utilisée si un super-admin pouvait créer des compagnies manuellement.
router.post(
    '/companies', 
    protect, 
    validateCompanyCreation, 
    companyController.
    createCompany);

router.get(
    '/companies',
    protect,
    authorize('admin'),
    parsePagination(10), 
    companyController.getAllCompanies
);

router.get(
    '/companies/:id',
    protect,
    authorize('admin'),
    validateUuidParam('id'),
    companyController.getCompanyById
);

export default router;