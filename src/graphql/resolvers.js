/**
 * @file Définit les résolveurs pour le schéma GraphQL.
 * @description Contient la logique pour chaque query, mutation et relation.
 * Chaque fonction est documentée pour clarifier son rôle, ses arguments et sa valeur de retour.
 */
import { GraphQLError } from 'graphql';
import { ROLES } from '../config/constants.js';
import authService from '../services/authService.js';
import offerService from '../services/offerService.js';
import orderService from '../services/orderService.js';
import paymentService from '../services/paymentService.js';
import userService from '../services/userService.js';
import licenseRepository from '../repositories/licenseRepository.js';

// --- HELPERS D'AUTORISATION ---

/**
 * Assure que l'utilisateur est un admin de compagnie authentifié.
 * @param {object} user - L'objet utilisateur issu du contexte GraphQL.
 * @throws {GraphQLError} Si l'utilisateur n'a pas les permissions requises.
 */
const ensureAdmin = (user) => {
  if (!user || user.role !== ROLES.ADMIN) {
    throw new GraphQLError(
      'Accès refusé. Vous devez être un administrateur de compagnie.',
      {
        extensions: { code: 'FORBIDDEN' },
      }
    );
  }
};

/**
 * Assure que l'utilisateur est un administrateur de la plateforme (super-admin).
 * @param {object} user - L'objet utilisateur issu du contexte GraphQL.
 * @throws {GraphQLError} Si l'utilisateur n'a pas les permissions requises.
 */
const ensureSuperAdmin = (user) => {
  if (!user || user.role !== ROLES.SUPER_ADMIN) {
    throw new GraphQLError(
      'Accès refusé. Privilèges super-administrateur requis.',
      {
        extensions: { code: 'FORBIDDEN' },
      }
    );
  }
};

export const resolvers = {
  /**
   * @description Résolveurs pour les requêtes de type Query.
   */
  Query: {
    /**
     * @description Récupère toutes les offres publiques.
     * @returns {Promise<Array<object>>}
     */
    publicOffers: () => offerService.getAllPublicOffers(),

    /**
     * @description Récupère toutes les offres (publiques et privées). Requiert des droits super-admin.
     * @param {object} context - Le contexte GraphQL, contenant l'utilisateur.
     * @returns {Promise<Array<object>>}
     */
    allOffers: (_, __, context) => {
      ensureSuperAdmin(context.user);
      return offerService.getAllOffers();
    },

    /**
     * @description Récupère une commande par son ID, en vérifiant que l'utilisateur y a accès.
     * @param {object} args - Les arguments de la requête, contenant { id }.
     * @param {object} context - Le contexte GraphQL.
     * @returns {Promise<object>}
     */
    order: async (_, { id }, context) => {
      ensureAdmin(context.user);
      const order = await context.dataloaders.orderLoader.load(id);
      if (!order || order.company_id !== context.user.companyId) {
        throw new GraphQLError('Commande non trouvée ou accès non autorisé.', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      return order;
    },

    /**
     * @description Récupère la licence active pour la compagnie de l'utilisateur.
     * @param {object} context - Le contexte GraphQL.
     * @returns {Promise<object|null>}
     */
    myActiveLicense: async (_, __, context) => {
      ensureAdmin(context.user);
      return licenseRepository.findActiveByCompanyId(context.user.companyId);
    },

    /**
     * @description Récupère les informations de l'utilisateur connecté.
     * @param {object} context - Le contexte GraphQL.
     * @returns {Promise<object>}
     */
    me: (_, __, context) => {
      if (!context.user)
        throw new GraphQLError('Non authentifié.', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      return userService.getUserById(context.user.userId, context.user);
    },

    /**
     * @description Récupère la liste paginée des utilisateurs de la compagnie.
     * @param {object} args - Les arguments de la requête, contenant { page, limit }.
     * @param {object} context - Le contexte GraphQL.
     * @returns {Promise<object>}
     */
    users: (_, { page, limit }, context) => {
      ensureAdmin(context.user);
      return userService.getAllUsers(page, limit, context.user);
    },
  },

  /**
   * @description Résolveurs pour les requêtes de type Mutation.
   */
  Mutation: {
    loginCompanyAdmin: (_, { email, password }) =>
      authService.loginCompanyAdmin(email, password),
    loginTechnician: (_, { email, password }) =>
      authService.loginTechnician(email, password),

    /**
     * @description Crée une commande pour l'utilisateur admin authentifié.
     * @returns {Promise<object>} Le payload de la mutation.
     */
    createOrder: async (_, { offerId }, context) => {
      ensureAdmin(context.user);
      const newOrder = await orderService.createOrder(offerId, context.user);
      return {
        success: true,
        message: 'Commande créée avec succès.',
        order: newOrder,
      };
    },

    createCheckoutSession: async (_, { orderId }, context) => {
      ensureAdmin(context.user);
      const checkoutSessionData = await paymentService.createCheckoutSession(
        orderId,
        context.user
      );
      // Return the data wrapped in the expected payload structure
      return {
        sessionId: checkoutSessionData.sessionId,
        url: checkoutSessionData.url,
      };
    },

    /**
     * @description Crée une nouvelle offre commerciale (super-admin).
     * @returns {Promise<object>} Le payload de la mutation.
     */
    createOffer: async (_, { input }, context) => {
      ensureSuperAdmin(context.user);
      const newOffer = await offerService.createOffer(input);
      return {
        success: true,
        message: `L'offre "${newOffer.name}" a été créée.`,
        offer: newOffer,
      };
    },
    /**
     * @description Met à jour une offre existante (super-admin).
     * @returns {Promise<object>} Le payload de la mutation.
     */
    updateOffer: async (_, { offerId, input }, context) => {
      ensureSuperAdmin(context.user);
      const updatedOffer = await offerService.updateOffer(offerId, input);
      return {
        success: true,
        message: `L'offre a été mise à jour.`,
        offer: updatedOffer,
      };
    },
    /**
     * @description Supprime une offre (super-admin).
     * @returns {Promise<boolean>}
     */
    deleteOffer: (_, { offerId }, context) => {
      ensureSuperAdmin(context.user);
      return offerService.deleteOffer(offerId);
    },
  },

  /**
   * @description Résolveurs pour les champs imbriqués, optimisés par les DataLoaders.
   */
  Order: {
    offer: (order, _, context) =>
      context.dataloaders.offerLoader.load(order.offer_id),
    company: (order, _, context) =>
      context.dataloaders.companyLoader.load(order.company_id),
  },
  License: {
    order: (license, _, context) =>
      context.dataloaders.orderLoader.load(license.order_id),
  },
  User: {
    company: (user, _, context) =>
      context.dataloaders.companyLoader.load(user.company_id),
  },
};
