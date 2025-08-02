/**
 * @file Crée et exporte la fonction de contexte GraphQL.
 * @description Ce module centralise la logique de création du contexte pour chaque
 * requête GraphQL. Il gère l'authentification de l'utilisateur via le token JWT
 * et injecte les DataLoaders pour optimiser les requêtes à la base de données.
 */

import jwt from 'jsonwebtoken';
import { pool } from '../db/index.js';
import { createDataLoaders } from './dataloaders.js';
import logger from '../config/logger.js';

/**
 * @typedef {import('express').Request} ExpressRequest
 * @typedef {import('./dataloaders.js').DataLoaders} DataLoaders
 */

/**
 * @description Crée le contexte GraphQL pour une requête.
 * Cette fonction est appelée à chaque requête GraphQL. Elle tente de vérifier le
 * token JWT d'authentification présent dans l'en-tête, récupère les informations
 * de l'utilisateur si le token est valide, et retourne un contexte contenant
 * l'utilisateur authentifié (le cas échéant) et les instances de DataLoaders.
 *
 * @param {{ req: ExpressRequest }} Express context object containing the request.
 * @returns {Promise<{ user?: object, dataloaders: DataLoaders }>} Un objet contexte pour Apollo Server.
 */
export const createGraphQLContext = async ({ req }) => {
  // 1. Initialise les dataloaders pour chaque requête afin d'éviter le cache inter-requêtes.
  const dataloaders = createDataLoaders();

  // 2. Extrait le token de l'en-tête 'Authorization'.
  const authHeader = req.headers?.authorization ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    // Retourne un contexte public si aucun token n'est fourni.
    return { dataloaders };
  }
  const token = authHeader.substring(7);

  try {
    // 3. Vérifie et décode le token JWT.
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    if (!decoded?.userId) {
      return { dataloaders };
    }

    // 4. Récupère l'utilisateur depuis la base de données.
    const { rows } = await pool.query(
      'SELECT user_id, company_id, email, role, is_active FROM users WHERE user_id = $1',
      [decoded.userId]
    );
    const currentUser = rows[0];

    // 5. Assure que l'utilisateur est bien actif.
    if (!currentUser?.is_active) {
      logger.warn(
        { userId: currentUser.user_id },
        "Tentative de connexion d'un utilisateur inactif."
      );
      return { dataloaders };
    }

    // 6. Retourne le contexte complet avec l'utilisateur authentifié.
    return { user: currentUser, dataloaders };
  } catch (error) {
    // Log l'erreur si le token est invalide ou expiré, sans bloquer la requête.
    logger.warn(
      { err: error },
      `Validation du token JWT échouée: ${error.message}`
    );
    // Retourne un contexte public en cas d'échec.
    return { dataloaders };
  }
};
