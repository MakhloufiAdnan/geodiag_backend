/**
 * @file Tests unitaires complets pour les résolveurs GraphQL.
 * @description Valide la logique de chaque query et mutation en isolant les services.
 * Couvre les chemins heureux et les cas d'erreur (permissions, données non trouvées, etc.).
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import { ROLES } from '../../src/config/constants.js';
import {
  mockAdminUser,
  mockTechnicianUser,
  mockOrder,
} from '../../mocks/mockData.js';

// --- Mocks Complets des Services ---
// Simule toutes les dépendances externes des résolveurs pour les isoler.
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

// --- Imports après les mocks ---
const { default: offerService } = await import(
  '../../src/services/offerService.js'
);
const { default: orderService } = await import(
  '../../src/services/orderService.js'
);
const { default: licenseRepository } = await import(
  '../../src/repositories/licenseRepository.js'
);
const { resolvers } = await import('../../src/graphql/resolvers.js');

describe('GraphQL Resolvers', () => {
  let mockContext;

  // Création d'utilisateurs de test avec des UUID valides pour chaque rôle.
  const mockSuperAdmin = { role: ROLES.SUPER_ADMIN, userId: uuidv4() };
  const mockAdmin = {
    role: ROLES.ADMIN,
    userId: mockAdminUser.user_id,
    companyId: mockAdminUser.company_id,
  };
  const mockTechnician = {
    role: ROLES.TECHNICIAN,
    userId: mockTechnicianUser.user_id,
    companyId: mockTechnicianUser.company_id,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Contexte de base pour un utilisateur non authentifié.
    mockContext = {
      user: null,
      dataloaders: {
        orderLoader: { load: jest.fn() },
      },
    };
  });

  // --- TESTS POUR LES QUERIES ---

  describe('Query.order', () => {
    /**
     * @test {heureux} Doit retourner une commande si l'utilisateur est un admin de la bonne compagnie.
     */
    it("doit retourner une commande si l'utilisateur est un admin de la bonne compagnie", async () => {
      // Arrange
      const orderData = { ...mockOrder, company_id: mockAdmin.companyId };
      mockContext.user = mockAdmin;
      mockContext.dataloaders.orderLoader.load.mockResolvedValue(orderData);

      // Act
      const result = await resolvers.Query.order(
        null,
        { id: orderData.order_id },
        mockContext
      );

      // Assert
      expect(result).toEqual(orderData);
      expect(mockContext.dataloaders.orderLoader.load).toHaveBeenCalledWith(
        orderData.order_id
      );
    });

    /**
     * @test {échec} Doit lever une erreur FORBIDDEN si l'utilisateur n'est pas un admin.
     */
    it("doit lever une erreur FORBIDDEN si l'utilisateur n'est pas un admin", async () => {
      // Arrange
      mockContext.user = mockTechnician;

      // Act & Assert
      await expect(
        resolvers.Query.order(null, { id: uuidv4() }, mockContext)
      ).rejects.toThrow('Accès refusé.'); 
    });
  });

  describe('Query.myActiveLicense', () => {
    /**
     * @test {heureux} Doit appeler le repository avec le bon companyId pour un admin.
     */
    it('doit appeler le repository avec le bon companyId pour un admin', async () => {
      // Arrange
      mockContext.user = mockAdmin;
      licenseRepository.findActiveByCompanyId.mockResolvedValue({
        id: uuidv4(),
      });

      // Act
      await resolvers.Query.myActiveLicense(null, {}, mockContext);

      // Assert
      expect(licenseRepository.findActiveByCompanyId).toHaveBeenCalledWith(
        mockAdmin.companyId
      );
    });
  });

  // --- TESTS POUR LES MUTATIONS ---

  describe('Mutation.createOffer', () => {
    const offerInput = {
      name: 'Nouvelle Offre',
      price: 100,
      durationMonths: 12,
      isPublic: true,
    };

    /**
     * @test {heureux} Doit créer une offre et retourner un payload de succès si l'utilisateur est super_admin.
     */
    it("doit créer une offre et retourner un payload de succès si l'utilisateur est super_admin", async () => {
      // Arrange
      mockContext.user = mockSuperAdmin;
      const newOffer = { offerId: uuidv4(), ...offerInput };
      offerService.createOffer.mockResolvedValue(newOffer);

      // Act
      const result = await resolvers.Mutation.createOffer(
        null,
        { input: offerInput },
        mockContext
      );

      // Assert
      expect(offerService.createOffer).toHaveBeenCalledWith(offerInput);
      expect(result.offer).toEqual(newOffer);
      expect(result.success).toBe(true);
    });

    /**
     * @test {échec} Doit lever une erreur FORBIDDEN si l'utilisateur n'a pas les droits.
     */
    it("doit lever une erreur FORBIDDEN si l'utilisateur n'est pas super_admin", async () => {
      // Arrange
      mockContext.user = mockAdmin; // N'a pas les droits suffisants

      // Act & Assert
      await expect(
        resolvers.Mutation.createOffer(null, { input: offerInput }, mockContext)
      ).rejects.toThrow('Accès refusé.'); 
    });
  });

  describe('Mutation.createOrder', () => {
    /**
     * @test {échec} Doit propager l'erreur du service si la création de commande échoue.
     */
    it("doit propager l'erreur du service si la création échoue", async () => {
      // Arrange
      mockContext.user = mockAdmin;
      const serviceError = new Error('Offre non trouvée.');
      orderService.createOrder.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(
        resolvers.Mutation.createOrder(null, { offerId: uuidv4() }, mockContext)
      ).rejects.toThrow('Offre non trouvée.');
    });
  });
});
