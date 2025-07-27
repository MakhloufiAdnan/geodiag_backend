import { Router } from 'express';
import orderController from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateOrderCreation } from '../validators/orderValidator.js';
import { authorize } from '../middleware/authorizationMiddleware.js';

/**
 * @file Définit la route pour la création de commandes.
 */
const router = Router();

// Un admin authentifié peut créer une commande. Le corps de la requête est validé.
router.post(
  '/orders',
  protect,
  authorize('admin'),
  validateOrderCreation,
  orderController.createOrder
);

export default router;
