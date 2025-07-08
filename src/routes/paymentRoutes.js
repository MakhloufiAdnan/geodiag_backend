import { Router } from 'express';
import paymentController from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { createCheckoutSchema } from '../validators/paymentValidator.js';

const router = Router();
router.post('/payments/create-checkout-session', protect, validate(createCheckoutSchema), paymentController.createCheckoutSession);
export default router;