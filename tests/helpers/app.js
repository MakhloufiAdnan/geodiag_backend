/**
 * @file Crée et configure une instance de l'application Express pour l'environnement de test.
 * @description Ce helper assemble l'application en miroir de la configuration de production,
 * en incluant les middlewares, les routes REST, et le serveur GraphQL pour permettre
 * des tests d'intégration et de bout en bout complets.
 */

import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import jwt from 'jsonwebtoken';

import { errorHandler } from '../../src/middleware/errorHandler.js';
import { requestLogger } from '../../src/middleware/loggingMiddleware.js';
import paymentWebhookRoutes from '../../src/routes/paymentWebhookRoutes.js';
import allRestRoutes from '../../src/routes/index.js';

// Importer les composants GraphQL et la connexion à la BDD
import { typeDefs } from '../../src/graphql/typeDefs.js';
import { resolvers } from '../../src/graphql/resolvers.js';
import { createDataLoaders } from '../../src/graphql/dataloaders.js';
import { pool } from '../../src/db/index.js';
import logger from '../../src/config/logger.js';

/**
 * Crée une instance de l'application Express et un serveur HTTP pour les tests.
 * @returns {{app: express.Application, server: http.Server}}
 */
export const createTestApp = () => {
  const app = express();
  
  // --- CONFIGURATION D'APOLLO SERVER (miroir de index.js) ---
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });
  
  apolloServer.startInBackgroundHandlingStartupErrorsByLoggingAndFailingAllRequests();

  // --- MIDDLEWARES (dans le même ordre que index.js) ---
  app.use(cookieParser());
  app.use(requestLogger);

  app.use('/api', paymentWebhookRoutes);
  app.use(express.json());
  app.use('/api', allRestRoutes);

  // Middleware GraphQL avec un contexte complet
  app.use(
    '/graphql',
    expressMiddleware(apolloServer, {
      /**
       * @description Contexte GraphQL complet, miroir de la production.
       */
      context: async ({ req }) => {
        const authHeader = req.headers?.authorization ?? '';
        if (!authHeader.startsWith('Bearer ')) {
          return { dataloaders: createDataLoaders() };
        }
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
          if (!decoded.userId) return { dataloaders: createDataLoaders() };

          const { rows } = await pool.query(
            'SELECT user_id, company_id, email, role, is_active FROM users WHERE user_id = $1',
            [decoded.userId]
          );
          const currentUser = rows[0];

          if (!currentUser?.is_active) {
            return { dataloaders: createDataLoaders() };
          }
          
          const userContext = {
            userId: currentUser.user_id,
            companyId: currentUser.company_id,
            email: currentUser.email,
            role: currentUser.role,
            isActive: currentUser.is_active,
          };

          return { user: userContext, dataloaders: createDataLoaders() };
        } catch (error) {
          logger.warn({ err: error }, `[Test Context] JWT verification failed: ${error.message}`);
          return { dataloaders: createDataLoaders() };
        }
      },
    })
  );

  // Gestionnaire d'erreurs final
  app.use(errorHandler);

  const server = http.createServer(app);

  return { app, server };
};
