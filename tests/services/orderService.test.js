import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import {
  NotFoundException,
  ForbiddenException,
} from "../../src/exceptions/apiException.js";
import { mockAdminUser, mockTechnicianUser } from "../../mocks/mockData.js";

// Mocker les dépendances
jest.unstable_mockModule("../../src/repositories/orderRepository.js", () => ({
  default: { create: jest.fn() },
}));
jest.unstable_mockModule("../../src/services/offerService.js", () => ({
  default: { getOfferById: jest.fn() },
}));

// Imports après les mocks
const { default: orderRepository } = await import(
  "../../src/repositories/orderRepository.js"
);
const { default: offerService } = await import(
  "../../src/services/offerService.js"
);
const { default: orderService } = await import(
  "../../src/services/orderService.js"
);

describe("OrderService", () => {
  const mockOffer = { offer_id: "offer-abc", price: 150.0 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createOrder", () => {
    it("doit créer une commande si appelé par un admin avec une offre valide", async () => {
      // Arrange
      offerService.getOfferById.mockResolvedValue(mockOffer);
      orderRepository.create.mockResolvedValue({
        order_id: "new-order-id",
        ...mockOffer,
      });

      // Act
      await orderService.createOrder(mockOffer.offer_id, mockAdminUser);

      // Assert
      expect(orderRepository.create).toHaveBeenCalled(); // Vérifie que le montant et l'ID de compagnie sont corrects

      const createCallArg = orderRepository.create.mock.calls[0][0];
      expect(createCallArg.amount).toBe(mockOffer.price);
      expect(createCallArg.company_id).toBe(mockAdminUser.company_id);
    });

    it("doit lever une ForbiddenException si appelé par un technicien", async () => {
      // Arrange
      const action = () =>
        orderService.createOrder(mockOffer.offer_id, mockTechnicianUser);
      // Act & Assert
      await expect(action).rejects.toThrow(ForbiddenException);
    });

    it("doit lever une NotFoundException si l'offerId n'existe pas", async () => {
      // Arrange
      offerService.getOfferById.mockResolvedValue(null);

      const action = () =>
        orderService.createOrder("non-existent-offer", mockAdminUser);

      // Act & Assert
      await expect(action).rejects.toThrow(NotFoundException);
    });
  });
});
