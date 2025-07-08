import { Router } from 'express';
import express from 'express';
import paymentWebhookController from '../controllers/paymentWebhookController.js';
import { validateWebhook } from '../middleware/webhookAuthMiddleware.js';

const router = Router();
router.post('/webhooks/payment', express.raw({ type: 'application/json' }), validateWebhook, paymentWebhookController.handleWebhook);
export default router;
