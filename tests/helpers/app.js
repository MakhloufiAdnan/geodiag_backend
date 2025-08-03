import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cookieParser from 'cookie-parser';
import express from 'express';
import http from 'http';

// Importer la configuration, les middlewares et les routes de production
import { createGraphQLContext } from '../../src/graphql/context.js';
import { resolvers } from '../../src/graphql/resolvers.js';
import { typeDefs } from '../../src/graphql/typeDefs.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { requestLogger } from '../../src/middleware/loggingMiddleware.js';
import allRestRoutes from '../../src/routes/index.js';
import paymentWebhookRoutes from '../../src/routes/paymentWebhookRoutes.js';

/**
 * @file Crée et configure une instance de l'application Express pour l'environnement de test.
 * @description Ce helper assemble l'application en miroir de la configuration de production
 * pour permettre des tests d'intégration et de bout en bout complets.
 */

/**
 * Crée une instance de l'application Express et un serveur HTTP prêts pour les tests.
 * @returns {{app: express.Application, server: http.Server}} Un objet contenant l'app Express et le serveur HTTP.
 */
export const createTestApp = () => {
  const app = express();

  // --- Configuration d'Apollo Server (miroir de index.js) ---
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });

  apolloServer.startInBackgroundHandlingStartupErrorsByLoggingAndFailingAllRequests();

  // --- Middlewares (dans le même ordre que index.js) ---
  app.use(cookieParser());
  app.use(requestLogger);

  // Le webhook de paiement doit être avant express.json() pour recevoir le corps brut
  app.use('/api', paymentWebhookRoutes);

  app.use(express.json());

  // Autres routes REST
  app.use('/api', allRestRoutes);

  // Middleware GraphQL utilisant directement la fonction de contexte de production
  app.use(
    '/graphql',
    expressMiddleware(apolloServer, {
      context: createGraphQLContext, // Correction : Utilisation directe du module de production
    })
  );

  // Gestionnaire d'erreurs final
  app.use(errorHandler);

  const server = http.createServer(app);

  return { app, server };
};
