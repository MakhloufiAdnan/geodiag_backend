import express from 'express';
import http from 'http';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

// Imports pour la sécurité de l'API GraphQL
import depthLimit from 'graphql-depth-limit';
import { createComplexityRule, simpleEstimator } from 'graphql-validation-complexity';

// Imports de la logique métier et de la configuration de l'application
import { checkDatabaseConnection, pool } from './src/db/index.js';
import { typeDefs } from './src/graphql/typeDefs.js';
import { resolvers } from './src/graphql/resolvers.js';
import { errorHandler } from './src/middleware/errorHandler.js';

// Imports des routes REST
import userRoutes from './src/routes/userRoutes.js';
import companyRoutes from './src/routes/companyRoutes.js';
import vehicleRoutes from './src/routes/vehicleRoutes.js';
import registrationRoutes from './src/routes/registrationRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import paymentWebhookRoutes from './src/routes/paymentWebhookRoutes.js';

// ========================================================================
// ==                      DÉMARRAGE DU SERVEUR                          ==
// ========================================================================

/**
 * Fonction principale asynchrone pour initialiser et démarrer le serveur.
 */
async function startServer() {
  try {
    // --------------------------------------------------------------------
    // -- ÉTAPE 1 : VÉRIFICATION DES DÉPENDANCES (APPROCHE FAIL-FAST)    --
    // --------------------------------------------------------------------
    // Arrête le démarrage si la base de données n'est pas accessible.
    await checkDatabaseConnection();

    // --------------------------------------------------------------------
    // -- ÉTAPE 2 : INITIALISATION DES SERVEURS (EXPRESS & APOLLO)       --
    // --------------------------------------------------------------------
    const app = express();
    const httpServer = http.createServer(app);

    // Règle de validation pour limiter la complexité des requêtes GraphQL.
    const complexityRule = createComplexityRule({
      maximumComplexity: 1000, // Coût total maximum, à ajuster selon les besoins.
      variables: {},
      estimators: [
        simpleEstimator({ defaultComplexity: 1 }), // Par défaut, chaque champ a un coût de 1.
      ],
    });

    // Initialisation du serveur Apollo avec les règles de sécurité.
    const apolloServer = new ApolloServer({
      typeDefs,
      resolvers,
      validationRules: [
        depthLimit(7),      // Limite la profondeur des requêtes pour éviter les abus.
        complexityRule,     // Applique la règle de limitation de complexité.
      ],
    });

    await apolloServer.start();

    // --------------------------------------------------------------------
    // -- ÉTAPE 3 : CONFIGURATION DES MIDDLEWARES EXPRESS                --
    // --------------------------------------------------------------------
    // Active les requêtes cross-domaine.
    app.use(cors());

    // --------------------------------------------------------------------
    // -- ÉTAPE 4 : DÉFINITION DES ROUTES                                --
    // --------------------------------------------------------------------
    // L'ordre des routes et middlewares est crucial.

    // Route de "Health Check" pour la supervision du service.
    app.get('/', (req, res) => {
      res.status(200).send('API Geodiag is running with REST and GraphQL. 🎉');
    });

    // 1. La route pour les webhooks Stripe est enregistrée AVANT le parser JSON global,
    // car Stripe nécessite le corps brut de la requête pour valider la signature.
    app.use('/api', paymentWebhookRoutes);

    // 2. Activation du parser JSON pour toutes les autres routes.
    app.use(express.json());

    // 3. Enregistrement des routes REST.
    app.use('/api', userRoutes);
    app.use('/api', companyRoutes);
    app.use('/api', vehicleRoutes);
    app.use('/api', registrationRoutes);
    app.use('/api', authRoutes);

    // 4. Enregistrement de la route GraphQL avec la logique de contexte sécurisée.
    app.use('/graphql', expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        const authHeader = req.headers.authorization || '';
        if (!authHeader.startsWith('Bearer ')) {
          return {}; // Pas de token, retourne un contexte vide.
        }
        
        const token = authHeader.substring(7);
        try {
          // 1. Décoder le token pour obtenir uniquement le `userId`.
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (!decoded.userId) return {};

          // 2. Récupérer les informations à jour de l'utilisateur depuis la base de données.
          const { rows } = await pool.query(
            'SELECT user_id, company_id, email, first_name, last_name, role, is_active FROM users WHERE user_id = $1',
            [decoded.userId]
          );
          
          // La requête retourne un tableau, on prend le premier (et seul) résultat.
          const currentUser = rows[0];

          // 3. Vérifier si l'utilisateur existe et est actif.
          if (!currentUser || !currentUser.is_active) {
            return {}; // Utilisateur non trouvé ou inactif, retourne un contexte vide.
          }

          // 4. Renvoyer l'utilisateur vérifié, qui sera disponible dans tous les résolveurs.
          return { user: currentUser };

        } catch (error) {
          // Gère les tokens invalides ou expirés en retournant un contexte vide.
          console.error('Erreur de validation du token GraphQL:', error.message);
          return {};
        }
      },
    }));

    // --------------------------------------------------------------------
    // -- ÉTAPE 5 : GESTION DES ERREURS                                  --
    // --------------------------------------------------------------------
    // Ce middleware doit être le dernier pour attraper toutes les erreurs.
    app.use(errorHandler);

    // --------------------------------------------------------------------
    // -- ÉTAPE 6 : LANCEMENT DU SERVEUR                                 --
    // --------------------------------------------------------------------
    const PORT = process.env.PORT || 4000;
    await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));

    console.log(`🚀 Serveur prêt sur http://localhost:${PORT}`);
    console.log(`✨ Endpoint GraphQL prêt sur http://localhost:${PORT}/graphql`);

  } catch (error) {
    // Capture les erreurs critiques au démarrage (ex: connexion DB).
    console.error("🔥 Échec critique du démarrage du serveur. L'application va s'arrêter.");
    console.error(error);
    // Termine le processus avec un code d'erreur pour signaler l'échec au système d'orchestration.
    process.exit(1);
  }
}

// Lance l'application.
startServer();