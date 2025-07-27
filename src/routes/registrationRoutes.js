import { Router } from "express";
import rateLimit from "express-rate-limit";
import registrationController from "../controllers/registrationController.js";
import { validateRegister } from "../validators/registrationValidator.js";

/**
 * @file Définit la route pour l'inscription d'une nouvelle compagnie.
 */
const router = Router();

// Créer un limiteur : 5 requêtes par heure par IP
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5,
  message:
    "Trop de tentatives d'inscription depuis cette IP, veuillez réessayer dans une heure.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Route publique, mais avec une validation stricte des données d'entrée.
router.post(
  "/register/company",
  registrationLimiter,
  validateRegister,
  registrationController.registerCompany
);

export default router;
