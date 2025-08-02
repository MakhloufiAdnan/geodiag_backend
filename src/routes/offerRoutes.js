/**
 * @file Définit la route publique pour la consultation des offres commerciales.
 * @description La gestion (CRUD) des offres est assurée par l'API GraphQL.
 */
import { Router } from 'express';
import offerController from '../controllers/offerController.js';

const offerRouter = Router();

/**
 * @route GET /api/offers
 * @description Récupère la liste des offres publiques.
 * @access Public
 */
offerRouter.get('/offers', offerController.getAllOffers);

export default offerRouter;
