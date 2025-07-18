import { Router } from 'express';
import authRoutes from './authRoutes.js';
import companyRoutes from './companyRoutes.js';
import offerRoutes from './offerRoutes.js';
import orderRoutes from './orderRoutes.js';
import registrationRoutes from './registrationRoutes.js';
import userRoutes from './userRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import paymentWebhookRoutes from './paymentWebhookRoutes.js';
import vehicleRoutes from './vehicleRoutes.js';

const router = Router();

router.use(authRoutes);
router.use(companyRoutes);
router.use(offerRoutes);
router.use(orderRoutes);
router.use(registrationRoutes);
router.use(userRoutes);
router.use(paymentRoutes);
router.use(paymentWebhookRoutes);
router.use(vehicleRoutes);

export default router;