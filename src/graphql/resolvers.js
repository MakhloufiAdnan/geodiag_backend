import userService from '../services/userService.js';
import companyService from '../services/companyService.js';
import authService from '../services/authService.js';
import { GraphQLError } from 'graphql';

export const resolvers = {
    Query: {
        // Résolveurs (user, company, me) ...
        user: async (_, { id }) => {
        return userService.getUserById(id);
        },
        company: async (_, { id }) => {
        return companyService.getCompanyById(id);
        },
        me: async (_, __, context) => {
            if (!context.user) {
                throw new GraphQLError('Non authentifié.', { extensions: { code: 'UNAUTHENTICATED' } });
            }
            return userService.getUserById(context.user.userId);
        },

        // RÉSOLVEUR 'users' 
        users: async (_, { page, limit }, context) => {
        if (!context.user) {
            throw new GraphQLError('Vous devez être authentifié pour effectuer cette action.', {
            extensions: { code: 'UNAUTHENTICATED' },
            });
        }
        
        // Renvoie l'objet de pagination complet
        return userService.getAllUsers(page, limit);
        },
    },

    Mutation: {
        // Résolveurs de mutation 
        loginCompanyAdmin: async (_, { email, password }) => {
        return authService.loginCompanyAdmin(email, password);
        },
        loginTechnician: async (_, { email, password }) => {
        return authService.loginTechnician(email, password);
        },
        createUser: async (_, { input }, context) => {
        if (!context.user || context.user.role !== 'admin') {
            throw new GraphQLError('Seul un administrateur peut créer des utilisateurs.', {
            extensions: { code: 'FORBIDDEN' },
            });
        }
        return userService.createUser(input);
        },
    },

    User: {
        // Résolveur de relation
        company: async (user) => {
        if (!user.companyId) return null;
        return companyService.getCompanyById(user.companyId);
        },
    },
};