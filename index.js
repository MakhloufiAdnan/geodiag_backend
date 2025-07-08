import express from 'express';
import http from 'http';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

// Logique métier et configuration de l'application
import { checkDatabaseConnection } from './src/db/checkConnection.js';
import { typeDefs } from './src/graphql/typeDefs.js';
import { resolvers } from './src/graphql/resolvers.js';

// Middlewares
import { errorHandler } from './src/middleware/errorHandler.js';

// Routes REST
import userRoutes from './src/routes/userRoutes.js';
import companyRoutes from './src/routes/companyRoutes.js';
import vehicleRoutes from './src/routes/vehicleRoutes.js';
import registrationRoutes from './src/routes/registrationRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import paymentWebhookRoutes from './src/routes/paymentWebhookRoutes.js';

// ========================================================================
// ==                    DÉMARRAGE DU SERVEUR                            ==
// ========================================================================

/**
 * Fonction principale qui initialise et démarre le serveur.
 * Elle est asynchrone pour gérer les démarrages de services (DB, Apollo).
 */
async function startServer() {
  try {

    // --------------------------------------------------------------------
    // -- ÉTAPE 1 : VÉRIFICATION DES DÉPENDANCES (APPROCHE FAIL-FAST)    --
    // --------------------------------------------------------------------
    // Vérifie la connexion à la base de données AVANT de démarrer
    // le serveur web. Si cela échoue, l'application s'arrête immédiatement.
    await checkDatabaseConnection();

    // --------------------------------------------------------------------
    // -- ÉTAPE 2 : INITIALISATION DES SERVEURS (EXPRESS & APOLLO)       --
    // --------------------------------------------------------------------
    const app = express();
    const httpServer = http.createServer(app);

    const apolloServer = new ApolloServer({
      typeDefs,
      resolvers,
    });

    // Le démarrage du serveur Apollo est asynchrone et doit être attendu.
    await apolloServer.start();

    // --------------------------------------------------------------------
    // -- ÉTAPE 3 : CONFIGURATION DES MIDDLEWARES EXPRESS                --
    // --------------------------------------------------------------------
    // L'ordre des middlewares est important.

    // Active CORS pour autoriser les requêtes cross-domaine.
    app.use(cors());

    // --------------------------------------------------------------------
    // -- ÉTAPE 4 : DÉFINITION DES ROUTES                                --
    // --------------------------------------------------------------------

    // Route de "Health Check" pour vérifier que le service est en ligne.
    app.get('/', (req, res) => {
      res.status(200).send('API Geodiag is running with REST and GraphQL. 🎉');
    });

    // 1. Enregistrer la route du webhook AVANT le parser JSON global.
    // Le fichier de route lui-même appliquera le parser `express.raw`.
    app.use('/api', paymentWebhookRoutes);

    // 2. Appliquer le parser JSON pour toutes les autres routes.
    app.use(express.json());

    // 3. Enregistrement de toutes les routes REST sous le préfixe /api
    app.use('/api', userRoutes);
    app.use('/api', companyRoutes);
    app.use('/api', vehicleRoutes);
    app.use('/api', registrationRoutes);
    app.use('/api', authRoutes);

    // 4. Enregistrement du point d'entrée GraphQL sur /graphql
    app.use('/graphql', expressMiddleware(apolloServer, {
      context: async ({ req }) => {

        // 1. Extraire le token des en-têtes
        const authHeader = req.headers.authorization || '';
        if (!authHeader.startsWith('Bearer ')) {

            // Si pas de token, renvoie un contexte sans utilisateur
            return {};
        }
        const token = authHeader.substring(7);
        try {

            // 2. Vérifier le token et extraire le payload de l'utilisateur
            const userPayload = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Renvoyer le payload dans le contexte pour qu'il soit
            // accessible à tous les résolveurs via `context.user`
            return { user: userPayload };
        } catch (error) {

            // En cas de token invalide ou expiré, on renvoie un contexte sans utilisateur
            console.error('Erreur de validation du token GraphQL:', error.message);
            return {};
        }
      },
    }));

    // --------------------------------------------------------------------
    // -- ÉTAPE 5 : GESTION DES ERREURS                                  --
    // --------------------------------------------------------------------
    // Le gestionnaire d'erreurs doit TOUJOURS être le dernier middleware
    // enregistré pour attraper les erreurs de toutes les routes précédentes.
    app.use(errorHandler);

    // --------------------------------------------------------------------
    // -- ÉTAPE 6 : LANCEMENT DU SERVEUR                                 --
    // --------------------------------------------------------------------
    const PORT = process.env.PORT || 4000;
    await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));

    console.log(`🚀 Serveur prêt sur http://localhost:${PORT}`);
    console.log(`✨ Endpoint GraphQL prêt sur http://localhost:${PORT}/graphql`);

  } catch (error) {

    // Si une erreur critique se produit au démarrage (ex: échec de la connexion DB),
    // affichage et on arrête l'application.
    console.error("🔥 Échec critique du démarrage du serveur. L'application va s'arrêter.");
    console.error(error);
    
    // process.exit(1) signale que le processus s'est terminé avec une erreur.
    // C'est ce qui fera échouer le déploiement sur Render ou le conteneur Docker.
    process.exit(1);
  }
}

// Lancement de l'application.
startServer();