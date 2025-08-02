/**
 * @file Point d'entrée principal de l'application backend Geodiag.
 * @description Ce fichier initialise le serveur, applique les middlewares de sécurité,
 * configure les API (REST résiduelle et GraphQL), et gère le démarrage robuste de l'application.
 */

// --- IMPORTS, VALIDATION & GESTIONNAIRES GLOBAUX ---
import 'dotenv/config';
import { validateEnv } from './src/utils/envValidator.js';
import logger from './src/config/logger.js';

// 1. VALIDER LA CONFIGURATION AVANT TOUTE CHOSE (FAIL-FAST)
validateEnv();

// 2. GESTIONNAIRES D'ERREURS GLOBALES (DERNIER FILET DE SÉCURITÉ)
process.on('uncaughtException', (error) => {
  logger.fatal(
    { err: error },
    "FATAL: Uncaught Exception thrown. Le serveur va s'arrêter."
  );
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ err: reason }, 'FATAL: Unhandled Rejection at:', promise);
  process.exit(1);
});

// --- IMPORTS DU SERVEUR ---
import express from 'express';
import helmet from 'helmet';
import http from 'http';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { GraphQLError } from 'graphql';
import depthLimit from 'graphql-depth-limit';
import {
  createComplexityRule,
  simpleEstimator,
} from 'graphql-query-complexity';

import { pool } from './src/db/index.js';
import { checkDatabaseConnection } from './src/db/connection.js';
import { typeDefs } from './src/graphql/typeDefs.js';
import { resolvers } from './src/graphql/resolvers.js';
import { createDataLoaders } from './src/graphql/dataloaders.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { requestLogger } from './src/middleware/loggingMiddleware.js';

// ROUTES REST FINALES (POST-CONSOLIDATION)
import allRestRoutes from './src/routes/index.js';
import webhookRoutes from './src/routes/paymentWebhookRoutes.js';

/**
 * @async
 * @function startServer
 * @description Fonction principale pour configurer et démarrer le serveur.
 */
async function startServer() {
  try {
    // --- ÉTAPE 1 : VÉRIFICATION DES DÉPENDANCES ---
    await checkDatabaseConnection();

    // --- ÉTAPE 2 : INITIALISATION DES SERVEURS (EXPRESS & APOLLO) ---
    const app = express();
    const httpServer = http.createServer(app);

    const complexityRule = createComplexityRule({
      maximumComplexity: 1000,
      variables: {},
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
      createError: (max, actual) =>
        new GraphQLError(`Query is too complex: ${actual}. Max: ${max}`),
    });

    const apolloServer = new ApolloServer({
      typeDefs,
      resolvers,
      validationRules: [depthLimit(7), complexityRule],
    });

    await apolloServer.start();

    // --- ÉTAPE 3 : CONFIGURATION DES MIDDLEWARES EXPRESS ---
    app.use(helmet());
    app.use(cookieParser());
    app.use(requestLogger);

    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [];
    app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        credentials: true,
      })
    );

    // --- ÉTAPE 4 : DÉFINITION DES ROUTES ---
    app.get('/healthz', (req, res) => res.status(200).send('OK'));

    // Route pour les webhooks Stripe AVANT le parser JSON global.
    app.use('/api', webhookRoutes);

    // Activation du parser JSON pour toutes les autres routes.
    app.use(express.json());

    // Enregistrement des routes REST restantes (auth, register, public offers).
    app.use('/api', allRestRoutes);

    // Enregistrement du middleware GraphQL comme point d'entrée principal pour les données.
    app.use(
      '/graphql',
      expressMiddleware(apolloServer, {
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
            logger.warn(
              { err: error },
              `Validation du token échouée: ${error.message}`
            );
            return { dataloaders: createDataLoaders() };
          }
        },
      })
    );

    // --- ÉTAPE 5 : GESTION DES ERREURS ---
    app.use(errorHandler);

    // --- ÉTAPE 6 : LANCEMENT DU SERVEUR ---
    const PORT = process.env.PORT || 3000;
    await new Promise((resolve) =>
      httpServer.listen({ port: PORT, host: '0.0.0.0' }, resolve)
    );

    logger.info(`🚀 Serveur prêt sur http://0.0.0.0:${PORT}`);
    logger.info(`✨ Endpoint GraphQL prêt sur http://0.0.0.0:${PORT}/graphql`);
  } catch (error) {
    logger.fatal({ err: error }, '🔥 Échec critique du démarrage du serveur.');
    process.exit(1);
  }
}

// Lancement de l'application
startServer();
