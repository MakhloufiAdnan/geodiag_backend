/**
 * @file Routeur principal pour l'API REST.
 * @description Agrège les sous-routeurs REST restants : authentification, inscription et points d'accès publics.
 */
import { Router } from 'express';
import authRoutes from './authRoutes.js';
import registrationRoutes from './registrationRoutes.js';
import offerRoutes from './offerRoutes.js';

const router = Router();

router.use(authRoutes);
router.use(registrationRoutes);
router.use(offerRoutes);

export default router;
