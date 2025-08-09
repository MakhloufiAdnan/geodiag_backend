/**
 * @file Crée et exporte la fonction de contexte GraphQL.
 * @description Ce module centralise la logique de création du contexte. Il gère
 * l'authentification, met en cache les données utilisateur dans Redis pour optimiser
 * les performances, et injecte les DataLoaders.
 */

import jwt from 'jsonwebtoken';
import { pool } from '../db/index.js';
import { createDataLoaders } from './dataloaders.js';
import logger from '../config/logger.js';
import redisClient from '../config/redisClient.js'; 

const USER_CACHE_PREFIX = 'user-cache:';
const USER_CACHE_TTL_SECONDS = 60; // Cache de 1 minute

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

    const cacheKey = `${USER_CACHE_PREFIX}${decoded.userId}`;

    // --- ÉTAPE 1 - VÉRIFICATION DU CACHE ---
    try {
      const cachedUser = await redisClient.get(cacheKey);
      if (cachedUser) {
        logger.debug(
          { userId: decoded.userId },
          'Cache HIT pour le contexte utilisateur.'
        );
        return { user: JSON.parse(cachedUser), dataloaders };
      }
    } catch (redisError) {
      logger.error(
        { err: redisError },
        "Erreur d'accès au cache Redis pour le contexte."
      );
      // Ne pas bloquer la requête si Redis est indisponible.
    }

    logger.debug(
      { userId: decoded.userId },
      'Cache MISS pour le contexte utilisateur.'
    );

    // --- ÉTAPE 2 - RÉCUPÉRATION DEPUIS LA BASE DE DONNÉES (CACHE MISS) ---
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

    // 6. Formater l'objet utilisateur brut de la BDD en un objet standard (camelCase).
    const userContext = {
      userId: currentUser.user_id,
      companyId: currentUser.company_id,
      email: currentUser.email,
      role: currentUser.role,
      isActive: currentUser.is_active,
    };

    // --- ÉTAPE 3 - MISE EN CACHE ---
    try {
      await redisClient.set(
        cacheKey,
        JSON.stringify(userContext),
        'EX',
        USER_CACHE_TTL_SECONDS
      );
    } catch (redisError) {
      logger.error(
        { err: redisError },
        'Erreur de mise en cache Redis pour le contexte.'
      );
    }

    // 6. Formater l'objet utilisateur brut de la BDD en un objet standard (camelCase).
    return { user: userContext, dataloaders };
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
