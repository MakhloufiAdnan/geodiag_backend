import { Router } from 'express';
import orderController from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateOrderCreation } from '../validators/orderValidator.js';

const router = Router();
router.post('/orders', protect, validateOrderCreation, orderController.createOrder);
export default router;