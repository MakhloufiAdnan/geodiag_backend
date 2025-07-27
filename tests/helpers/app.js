/**
 * @file Crée et configure une instance de l'application Express pour l'environnement de test.
 * @module tests/helpers/app
 */

import express from "express";
import http from "http";
import cookieParser from "cookie-parser";
import { errorHandler } from "../../src/middleware/errorHandler.js";
import { requestLogger } from "../../src/middleware/loggingMiddleware.js";
import paymentWebhookRoutes from "../../src/routes/paymentWebhookRoutes.js";
import allOtherRoutes from "../../src/routes/index.js";
/**
 * Crée une instance de l'application Express et un serveur HTTP pour les tests.
 * La configuration est optimisée pour les tests, notamment pour la gestion des webhooks.
 * @returns {{app: express.Application, server: http.Server}} Un objet contenant l'app Express et le serveur HTTP.
 */
export const createTestApp = () => {
  const app = express();

  // Middleware de base
  app.use(cookieParser());
  app.use(requestLogger);

  /**
   * @description La route du webhook Stripe est montée AVANT `express.json()`.
   * Stripe a besoin du corps "brut" (raw body) de la requête pour vérifier la signature. `express.json()` parserait la requête et rendrait
   * le corps brut indisponible.
   */
  app.use("/api", paymentWebhookRoutes);

  /**
   * @description Ce middleware parse le corps des requêtes JSON pour toutes les autres routes.
   * Il est placé après la route du webhook pour ne pas interférer avec elle.
   */
  app.use(express.json());

  /**
   * @description Monte toutes les autres routes de l'application sous le préfixe /api.
   */
  app.use("/api", allOtherRoutes);

  /**
   * @description Middleware de gestion des erreurs, placé en dernier.
   */
  app.use(errorHandler);

  const server = http.createServer(app);

  return { app, server };
};
