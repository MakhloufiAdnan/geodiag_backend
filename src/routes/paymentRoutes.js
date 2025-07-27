import { Router } from "express";
import paymentController from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateCheckoutCreation } from "../validators/paymentValidator.js";

/**
 * @file Définit la route pour initier un paiement.
 */
const router = Router();

// Un admin authentifié peut créer une session de paiement pour une commande.
router.post(
  "/payments/create-checkout-session",
  protect,
  validateCheckoutCreation,
  paymentController.createCheckoutSession
);

export default router;
