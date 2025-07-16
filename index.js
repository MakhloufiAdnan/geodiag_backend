/**
 * @file Point d'entrée principal de l'application backend Geodiag.
 * @description Ce fichier initialise un serveur hybride qui expose à la fois
 * une API REST traditionnelle et une API GraphQL via Apollo Server. Il gère
 * la configuration, les middlewares, la sécurité et le démarrage du serveur.
 * L'architecture est conçue pour être robuste, sécurisée et observable.
 */

// ========================================================================
// ==                      IMPORTS DE BASE ET CONFIGURATION              ==
// ========================================================================
import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { GraphQLError } from 'graphql';

// ========================================================================
// ==                      MODULES DE SÉCURITÉ GRAPHQL                   ==
// ========================================================================
import depthLimit from 'graphql-depth-limit';
import { createComplexityRule, simpleEstimator } from 'graphql-query-complexity';

// ========================================================================
// ==                      MODULES APPLICATIFS                           ==
// ========================================================================
import { pool } from './src/db/index.js';
import { checkDatabaseConnection } from './src/db/connection.js';
import { typeDefs } from './src/graphql/typeDefs.js';
import { resolvers } from './src/graphql/resolvers.js';
import { errorHandler } from './src/middleware/errorHandler.js';

// Importation de toutes les routes REST de l'application
import authRoutes from './src/routes/authRoutes.js';
import companyRoutes from './src/routes/companyRoutes.js';
import offerRoutes from './src/routes/offerRoutes.js';
import orderRoutes from './src/routes/orderRoutes.js';
import paymentRoutes from './src/routes/paymentRoutes.js';
import webhookRoutes from './src/routes/paymentWebhookRoutes.js';
import registrationRoutes from './src/routes/registrationRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import vehicleRoutes from './src/routes/vehicleRoutes.js';

/**
 * @async
 * @function startServer
 * @description Fonction principale asynchrone pour initialiser, configurer et démarrer le serveur.
 * Elle suit une approche "fail-fast" en vérifiant les dépendances critiques (comme la base de données)
 * avant de tenter de démarrer le serveur.
 */
async function startServer() {
  try {
    // --- ÉTAPE 1 : VÉRIFICATION DES DÉPENDANCES (APPROCHE FAIL-FAST) ---
    // Le serveur ne démarre que si la connexion à la base de données est établie.
    await checkDatabaseConnection();

    // --- ÉTAPE 2 : INITIALISATION DES SERVEURS (EXPRESS & APOLLO) ---
    const app = express();
    const httpServer = http.createServer(app);

    /**
     * @description Règle pour limiter la complexité des requêtes GraphQL.
     * Prévient les abus en calculant un "coût" pour chaque requête et en la rejetant si elle dépasse un seuil.
     * @see https://github.com/slicknode/graphql-query-complexity
     */
    const complexityRule = createComplexityRule({
      maximumComplexity: 1000, // Seuil maximal de complexité autorisé.
      variables: {}, // Doit être initialisé. Les variables de la requête seront injectées ici.
      estimators: [
        // Attribue une complexité de 1 à chaque champ par défaut.
        simpleEstimator({ defaultComplexity: 1 }),
      ],
      createError: (max, actual) => {
        return new GraphQLError(`Query is too complex: ${actual}. Maximum allowed complexity: ${max}`);
      },
      onComplete: (complexity) => {
        console.log(`Query Complexity: ${complexity}`);
      },
    });

    /**
     * @description Instance du serveur Apollo.
     * Intègre les définitions de types, les résolveurs et les règles de validation pour la sécurité.
     */
    const apolloServer = new ApolloServer({
      typeDefs,
      resolvers,
      /**
       * @description Règles de validation appliquées à chaque requête GraphQL entrante.
       * C'est une couche de défense essentielle contre les requêtes malveillantes.
       */
      validationRules: [
        depthLimit(7),      // Limite la profondeur des requêtes pour éviter les abus.
        complexityRule,     // Applique la règle de limitation de complexité.
      ],
    });

    await apolloServer.start();

    // --- ÉTAPE 3 : CONFIGURATION DES MIDDLEWARES EXPRESS ---

    /**
     * @description Configuration de la politique CORS (Cross-Origin Resource Sharing).
     * @see https://expressjs.com/en/resources/middleware/cors.html
     */
    const allowedOrigins = process.env.ALLOWED_ORIGINS? process.env.ALLOWED_ORIGINS.split(',') : [];
    const corsOptions = {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    };

    app.use(cors(corsOptions));

    // --- ÉTAPE 4 : DÉFINITION DES ROUTES ---
    /**
     * @description Route de "Health Check" pour la supervision du service.
     * Permet aux systèmes de monitoring (ex: Kubernetes, AWS) de vérifier si le service est en ligne.
     */
    app.get('/', (req, res) => {
      res.status(200).send('API Geodiag is running with REST and GraphQL. 🎉');
    });

    // 1. La route pour les webhooks Stripe est enregistrée AVANT le parser JSON global.
    // C'est crucial car le middleware de vérification de signature de Stripe a besoin du corps brut (raw body) de la requête.
    app.use('/api', webhookRoutes);

    // 2. Activation du parser JSON pour toutes les autres routes.
    app.use(express.json());

    // 3. Enregistrement des routes de l'API REST.
    app.use('/api', authRoutes);
    app.use('/api', companyRoutes);
    app.use('/api', offerRoutes);
    app.use('/api', orderRoutes);
    app.use('/api', paymentRoutes);
    app.use('/api', registrationRoutes);
    app.use('/api', userRoutes);
    app.use('/api', vehicleRoutes);

    /**
     * @description Enregistrement du middleware GraphQL.
     * Toutes les requêtes vers '/graphql' seront gérées par Apollo Server.
     */
    app.use('/graphql', expressMiddleware(apolloServer, {
      /**
       * @description Fonction de contexte pour les requêtes GraphQL.
       * Extrait le token JWT, le valide, et attache les informations de l'utilisateur
       * au contexte de la requête. Ce contexte est ensuite disponible dans tous les résolveurs.
       * @param {object} context - L'objet de contexte de la requête, contenant `req`.
       * @returns {Promise<object>} Le contexte enrichi avec les informations de l'utilisateur.
       */
      context: async ({ req }) => {
        const authHeader = req.headers?.authorization?? '';
        if (!authHeader.startsWith('Bearer ')) {
          return {}; // Pas de token, retourne un contexte vide.
        }

        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (!decoded.userId) return {};

          // Récupère les données utilisateur à jour pour chaque requête,
          // garantissant que les permissions sont toujours fraîches.
          const { rows } = await pool.query(
            'SELECT user_id, company_id, email, role, is_active FROM users WHERE user_id = $1',
            [decoded.userId]
          );

          const currentUser = rows[0];

          // Si l'utilisateur n'existe pas ou a été désactivé, ne pas l'authentifier.
          if (!currentUser ||!currentUser.is_active) {
            return {};
          }
          
          return { user: currentUser };

        } catch (error) {
          // Gère les tokens invalides ou expirés en retournant un contexte vide.
          console.error(`[GraphQL Context] Erreur de validation du token : ${error.message}`);
          return {};
        }
      },
    }));

    // --- ÉTAPE 5 : GESTION DES ERREURS ---
    // Ce middleware doit être le dernier pour attraper toutes les erreurs non gérées
    // par les routes précédentes et les formater de manière cohérente.
    app.use(errorHandler);

    // --- ÉTAPE 6 : LANCEMENT DU SERVEUR ---
    const PORT = process.env.PORT || 4000;
    await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));

    console.log(`🚀 Serveur prêt sur http://localhost:${PORT}`);
    console.log(`✨ Endpoint GraphQL prêt sur http://localhost:${PORT}/graphql`);

  } catch (error) {
    // Capture les erreurs critiques au démarrage (ex: échec de la connexion à la BDD).
    console.error("🔥 Échec critique du démarrage du serveur. L'application va s'arrêter.", error);
    process.exit(1);
  }
}

// Lance l'application.
startServer();