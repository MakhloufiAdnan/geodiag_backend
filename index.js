import express from 'express';
import http from 'http';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

// Import des routes et middlewares REST existants
import userRoutes from './src/routes/userRoutes.js';
import { errorHandler } from './src/middleware/errorHandler.js';

// Import des services qui contiennent la logique métier
// Ils seront réutilisés par les résolveurs GraphQL
import userService from './src/services/userService.js';

// --- CONFIGURATION APOLLO SERVER v4 ---

// 1. Définir le schéma GraphQL (le "contrat" de l'API)
// Ce schéma est basé sur votre DTO, vos services et votre base de données.
const typeDefs = `#graphql
  # Le type User, basé sur votre UserDto
  type User {
    userId: ID!
    email: String!
    firstName: String
    lastName: String
    role: String
    isActive: Boolean
  }

  # Le type pour le retour de la connexion
  type AuthPayload {
    token: String!
    user: User!
  }

  # Le type pour les métadonnées de pagination
  type Meta {
    totalItems: Int!
    totalPages: Int!
    currentPage: Int!
    pageSize: Int!
  }

  # Le type pour la réponse paginée
  type PaginatedUsers {
    data: [User]!
    meta: Meta!
  }

  # Les "inputs" pour les mutations, basés sur vos validateurs Joi
  input CreateUserInput {
    company_id: ID!
    email: String!
    password: String!
    first_name: String!
    last_name: String!
    role: String!
  }

  input UpdateUserInput {
    first_name: String
    last_name: String
    email: String
    role: String
    is_active: Boolean
  }

  # Les requêtes de LECTURE disponibles
  type Query {
    users(page: Int, limit: Int): PaginatedUsers
    user(id: ID!): User
  }

  # Les requêtes d'ÉCRITURE disponibles
  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User
    deleteUser(id: ID!): User
  }
`;

// 2. Définir les résolveurs (la "logique" de l'API)
// Chaque fonction ici appelle directement votre service existant.
const resolvers = {
  Query: {
    users: (parent, args) => {
      const page = args.page || 1;
      const limit = args.limit || 10;
      return userService.getAllUsers(page, limit);
    },
    user: (parent, { id }) => userService.getUserById(id),
  },
  Mutation: {
    login: (parent, { email, password }) => userService.loginUser(email, password),
    createUser: (parent, { input }) => userService.createUser(input),
    updateUser: (parent, { id, input }) => userService.updateUser(id, input),
    deleteUser: (parent, { id }) => userService.deleteUser(id),
  },
};

// --- CONFIGURATION DU SERVEUR EXPRESS + APOLLO ---

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Création de l'instance ApolloServer avec le schéma et les résolveurs
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });

  // Démarrage du serveur Apollo (étape obligatoire)
  await apolloServer.start();

  // Middlewares Express
  app.use(cors()); // Active CORS pour toutes les routes
  app.use(express.json()); // Pour parser les corps de requête JSON

  // Route pour le "Health Check"
  app.get('/', (req, res) => {
    res.status(200).send('API Geodiag is running with REST and GraphQL. 🎉');
  });

  // 1. Déclarer les routes REST existantes
  app.use('/api', userRoutes);

  // 2. Déclarer le nouveau point d'entrée GraphQL sur /graphql
  app.use('/graphql', expressMiddleware(apolloServer, {
    // Le contexte permet de passer des informations (comme le token)
    // à tous les résolveurs.
    context: async ({ req }) => ({ token: req.headers.authorization }),
  }));

  // 3. Déclarer le gestionnaire d'erreurs (doit être après les routes)
  app.use(errorHandler);

  // 4. Démarrer le serveur HTTP
  const PORT = process.env.PORT || 4000;
  await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));

  console.log(`🚀 Server ready at http://localhost:${PORT}`);
  console.log(`🚀 GraphQL endpoint ready at http://localhost:${PORT}/graphql`);
}

startServer();