import express, { Router } from 'express';
import paymentWebhookController from '../controllers/paymentWebhookController.js';
import { validateWebhook } from '../middleware/webhookAuthMiddleware.js';

/**
 * @file Définit la route pour recevoir les webhooks de paiement.
 * @description Cette route a une configuration de middleware spécifique pour
 * permettre la validation de la signature du webhook.
 */
const router = Router();

// 1. express.raw() : Conserve le corps brut de la requête pour la validation.
// 2. validateWebhook : Vérifie la signature du webhook.
// 3. paymentWebhookController.handleWebhook : Traite l'événement.
router.post(
  '/webhooks/payment',
  express.raw({ type: 'application/json' }),
  validateWebhook,
  paymentWebhookController.handleWebhook
);

export default router;
