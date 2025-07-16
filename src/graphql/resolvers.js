import userService from '../services/userService.js';
import authService from '../services/authService.js';
import offerService from '../services/offerService.js';
import orderService from '../services/orderService.js';
import paymentService from '../services/paymentService.js';
import licenseRepository from '../repositories/licenseRepository.js';
import { GraphQLError } from 'graphql';

// Helper pour vérifier si l'utilisateur est un admin authentifié
const ensureAdmin = (user) => {
    if (!user || user.role !== 'admin') {
        throw new GraphQLError('Accès refusé. Vous devez être un administrateur.', {
            extensions: { code: 'FORBIDDEN' },
        });
    }
};

export const resolvers = {
    // --- RÉSOLVEURS POUR LES QUERIES ---
    Query: {
        offers: async (_, __, context) => {
            ensureAdmin(context.user);
            return offerService.getAllOffers(context.user);
        },
        order: async (_, { id }, context) => {
            ensureAdmin(context.user);
            const order = await context.dataloaders.orderLoader.load(id); 
            if (!order || order.company_id !== context.user.companyId) {
                throw new GraphQLError('Commande non trouvée ou accès non autorisé.', { extensions: { code: 'NOT_FOUND' } });
            }
            return order;
        },
        myActiveLicense: async (_, __, context) => {
            ensureAdmin(context.user);
            return licenseRepository.findActiveByCompanyId(context.user.companyId);
        },
        me: async (_, __, context) => {
            if (!context.user) {
                throw new GraphQLError('Non authentifié.', { extensions: { code: 'UNAUTHENTICATED' } });
            }
            return userService.getUserById(context.user.userId, context.user);
        },
        users: async (_, { page, limit }, context) => {
            ensureAdmin(context.user);
            // Le service renvoie déjà l'objet complet { data, meta } qui correspond au type PaginatedUsers
            return userService.getAllUsers(page, limit, context.user);
        },
    },

    // --- RÉSOLVEURS POUR LES MUTATIONS ---
    Mutation: {
        // Authentification
        loginCompanyAdmin: (_, { email, password }) => authService.loginCompanyAdmin(email, password),
        loginTechnician: (_, { email, password }) => authService.loginTechnician(email, password),

        // Flux d'achat
        createOrder: (_, { offerId }, context) => {
            ensureAdmin(context.user);
            return orderService.createOrder(offerId, context.user);
        },
        createCheckoutSession: (_, { orderId }, context) => {
            ensureAdmin(context.user);
            return paymentService.createCheckoutSession(orderId, context.user);
        }
    },

    // --- RÉSOLVEURS DE RELATIONS (NESTED) ---
    // Permet de naviguer dans le graphe de données.
    Order: {
        offer: (order, _, context) => {
            return context.dataloaders.offerLoader.load(order.offer_id);
        },
        company: (order, _, context) => {
            return context.dataloaders.companyLoader.load(order.company_id);
        },
    },
    License: {
        order: (license, _, context) => {
            return context.dataloaders.orderLoader.load(license.order_id);
        },
    },
    User: {
        company: (user, _, context) => {
            return context.dataloaders.companyLoader.load(user.company_id);
        }
    }
};