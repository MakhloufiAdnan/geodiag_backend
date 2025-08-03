/**
 * @file Tests unitaires complets pour les résolveurs GraphQL.
 * @description Valide la logique de chaque query et mutation en isolant les services.
 * Couvre les chemins heureux et les cas d'erreur (permissions, données non trouvées, etc.).
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import { ROLES } from '../../src/config/constants.js';

// --- Mocks Complets des Services ---
jest.unstable_mockModule('../../src/services/authService.js', () => ({
  default: {
    loginCompanyAdmin: jest.fn(),
    loginTechnician: jest.fn(),
  },
}));
jest.unstable_mockModule('../../src/services/offerService.js', () => ({
  default: {
    getAllPublicOffers: jest.fn(),
    getAllOffers: jest.fn(),
    createOffer: jest.fn(),
    updateOffer: jest.fn(),
    deleteOffer: jest.fn(),
  },
}));
jest.unstable_mockModule('../../src/services/orderService.js', () => ({
  default: { createOrder: jest.fn() },
}));
jest.unstable_mockModule('../../src/services/paymentService.js', () => ({
  default: { createCheckoutSession: jest.fn() },
}));
jest.unstable_mockModule('../../src/services/userService.js', () => ({
  default: { getUserById: jest.fn(), getAllUsers: jest.fn() },
}));
jest.unstable_mockModule('../../src/repositories/licenseRepository.js', () => ({
  default: { findActiveByCompanyId: jest.fn() },
}));

// --- IMPORTS APRÈS LES MOCKS ---
const { default: authService } = await import('../../src/services/authService.js');
const { default: offerService } = await import('../../src/services/offerService.js');
const { default: paymentService } = await import('../../src/services/paymentService.js');
const { resolvers } = await import('../../src/graphql/resolvers.js');

describe('GraphQL Resolvers', () => {
  let mockContext;
  const mockSuperAdmin = { role: ROLES.SUPER_ADMIN, userId: uuidv4() };
  const mockAdmin = { role: ROLES.ADMIN, userId: uuidv4(), companyId: uuidv4() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = {
      user: null,
      dataloaders: {
        orderLoader: { load: jest.fn() },
        offerLoader: { load: jest.fn() },
        companyLoader: { load: jest.fn() },
      },
    };
  });

  // --- QUERIES ---

  describe('Query.publicOffers', () => {
    it('doit appeler offerService.getAllPublicOffers', async () => {
      // Arrange
      offerService.getAllPublicOffers.mockResolvedValue([]);
      // Act
      await resolvers.Query.publicOffers();
      // Assert
      expect(offerService.getAllPublicOffers).toHaveBeenCalled();
    });
  });
  
  describe('Query.order', () => {
    it('doit lever une erreur NOT_FOUND si la commande n`appartient pas à la compagnie de l`admin', async () => {
      // Arrange
      const orderData = { order_id: uuidv4(), company_id: 'wrong-company-id' };
      mockContext.user = mockAdmin;
      mockContext.dataloaders.orderLoader.load.mockResolvedValue(orderData);
  
      // Act & Assert
      await expect(
        resolvers.Query.order(null, { id: orderData.order_id }, mockContext)
      ).rejects.toThrow('Commande non trouvée ou accès non autorisé.');
    });
  });

  // --- MUTATIONS ---

  describe('Mutation.loginCompanyAdmin', () => {
    it('doit appeler authService.loginCompanyAdmin avec les bons arguments', async () => {
      // Arrange
      const args = { email: 'admin@test.com', password: 'password' };
      authService.loginCompanyAdmin.mockResolvedValue({});
      // Act
      await resolvers.Mutation.loginCompanyAdmin(null, args);
      // Assert
      expect(authService.loginCompanyAdmin).toHaveBeenCalledWith(args.email, args.password);
    });
  });

  describe('Mutation.loginTechnician', () => {
    it('doit appeler authService.loginTechnician avec les bons arguments', async () => {
        // Arrange
        const args = { email: 'tech@test.com', password: 'password' };
        authService.loginTechnician.mockResolvedValue({});
        // Act
        await resolvers.Mutation.loginTechnician(null, args);
        // Assert
        expect(authService.loginTechnician).toHaveBeenCalledWith(args.email, args.password);
    });
  });

  describe('Mutation.createCheckoutSession', () => {
    it('doit appeler paymentService.createCheckoutSession pour un admin', async () => {
        // Arrange
        mockContext.user = mockAdmin;
        const args = { orderId: uuidv4() };
        paymentService.createCheckoutSession.mockResolvedValue({ sessionId: 'sess_123', url: 'http://stripe.com' });

        // Act
        await resolvers.Mutation.createCheckoutSession(null, args, mockContext);

        // Assert
        expect(paymentService.createCheckoutSession).toHaveBeenCalledWith(args.orderId, mockAdmin);
    });
  });

  describe('Mutation.updateOffer', () => {
    it('doit appeler offerService.updateOffer pour un superAdmin', async () => {
        // Arrange
        mockContext.user = mockSuperAdmin;
        const args = { offerId: uuidv4(), input: { name: 'New Name' } };
        offerService.updateOffer.mockResolvedValue({ ...args.input });

        // Act
        await resolvers.Mutation.updateOffer(null, args, mockContext);

        // Assert
        expect(offerService.updateOffer).toHaveBeenCalledWith(args.offerId, args.input);
    });
  });

  describe('Mutation.deleteOffer', () => {
    it('doit appeler offerService.deleteOffer pour un superAdmin', async () => {
        // Arrange
        mockContext.user = mockSuperAdmin;
        const args = { offerId: uuidv4() };
        offerService.deleteOffer.mockResolvedValue(true);

        // Act
        await resolvers.Mutation.deleteOffer(null, args, mockContext);

        // Assert
        expect(offerService.deleteOffer).toHaveBeenCalledWith(args.offerId);
    });
  });

  // --- RESOLVERS DE CHAMP ---
  
  describe('Field Resolvers', () => {
    it('License.order doit appeler le orderLoader avec le bon order_id', () => {
        // Arrange
        const license = { license_id: uuidv4(), order_id: 'order-xyz' };
        // Act
        resolvers.License.order(license, null, mockContext);
        // Assert
        expect(mockContext.dataloaders.orderLoader.load).toHaveBeenCalledWith('order-xyz');
    });
  });
});
