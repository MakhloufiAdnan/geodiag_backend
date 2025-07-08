import { Router } from 'express';
import offerController from '../controllers/offerController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
// Un utilisateur authentifié peut voir les offres disponibles.
router.get('/offers', protect, offerController.getPublicOffers);
export default router;