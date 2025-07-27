import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from "../../src/exceptions/apiException.js";
import { LicenseDto } from "../../src/dtos/licenseDto.js";
// Importer les données de mock nécessaires.
import {
  mockAdminUser,
  mockOrder,
  mockOffer,
  mockCompany,
  mockLicense,
} from "../../mocks/mockData.js";

/**
 * @file Tests unitaires pour le PaymentService.
 * @description Ce fichier valide la logique métier liée aux paiements, en simulant
 * les dépendances externes (DB, Stripe, etc.) pour isoler et tester le service.
 */

// Simulation des dépendances externes
const mockStripeCheckoutSessionsCreate = jest.fn();
jest.unstable_mockModule("stripe", () => ({
  default: jest.fn(() => ({
    checkout: { sessions: { create: mockStripeCheckoutSessionsCreate } },
  })),
}));

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};
jest.unstable_mockModule("../../src/db/index.js", () => ({
  pool: {
    connect: jest.fn().mockResolvedValue(mockClient),
  },
}));

jest.unstable_mockModule("../../src/repositories/orderRepository.js", () => ({
  default: { findById: jest.fn(), updateStatus: jest.fn() },
}));
jest.unstable_mockModule("../../src/repositories/paymentRepository.js", () => ({
  default: { create: jest.fn() },
}));
jest.unstable_mockModule("../../src/repositories/companyRepository.js", () => ({
  default: { findById: jest.fn() },
}));
jest.unstable_mockModule("../../src/repositories/offerRepository.js", () => ({
  default: { findById: jest.fn() },
}));
jest.unstable_mockModule(
  "../../src/repositories/processedWebhookRepository.js",
  () => ({ default: { create: jest.fn() } })
);
jest.unstable_mockModule("../../src/repositories/jobRepository.js", () => ({
  default: { create: jest.fn() },
}));
jest.unstable_mockModule("../../src/services/licenseService.js", () => ({
  default: { createLicenseForOrder: jest.fn() },
}));
jest.unstable_mockModule("../../src/services/emailService.js", () => ({
  default: { sendLicenseAndInvoice: jest.fn() },
}));
jest.unstable_mockModule("../../src/utils/pdfGenerator.js", () => ({
  generateInvoicePdf: jest.fn(),
}));
jest.unstable_mockModule("../../src/config/logger.js", () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Imports dynamiques après la configuration des mocks
const { default: paymentService } = await import(
  "../../src/services/paymentService.js"
);
const { default: orderRepository } = await import(
  "../../src/repositories/orderRepository.js"
);
const { default: offerRepository } = await import(
  "../../src/repositories/offerRepository.js"
);
const { default: companyRepository } = await import(
  "../../src/repositories/companyRepository.js"
);
const { default: licenseService } = await import(
  "../../src/services/licenseService.js"
);
const { default: emailService } = await import(
  "../../src/services/emailService.js"
);
const { default: processedWebhookRepository } = await import(
  "../../src/repositories/processedWebhookRepository.js"
);
const { default: jobRepository } = await import(
  "../../src/repositories/jobRepository.js"
);
const { generateInvoicePdf } = await import("../../src/utils/pdfGenerator.js");
const { default: logger } = await import("../../src/config/logger.js");

describe("PaymentService", () => {
  // CORRECTION : Créer une version du mock utilisateur qui correspond aux attentes du service (companyId en camelCase)
  const mockAdminUserForPayment = {
    ...mockAdminUser,
    companyId: mockAdminUser.company_id,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.query.mockImplementation((sql) => {
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql))
        return Promise.resolve();
      return Promise.resolve({ rows: [] });
    });
  });

  describe("createCheckoutSession", () => {
    it("doit créer et retourner une session de paiement en cas de succès", async () => {
      // Arrange
      const session = {
        id: "cs_test_123",
        url: "https://checkout.stripe.com/...",
      };
      orderRepository.findById.mockResolvedValue(mockOrder);
      offerRepository.findById.mockResolvedValue(mockOffer);
      mockStripeCheckoutSessionsCreate.mockResolvedValue(session); // Act

      const result = await paymentService.createCheckoutSession(
        mockOrder.order_id,
        mockAdminUserForPayment // Utiliser le mock corrigé
      ); // Assert

      expect(orderRepository.findById).toHaveBeenCalledWith(mockOrder.order_id);
      expect(offerRepository.findById).toHaveBeenCalledWith(mockOrder.offer_id);
      expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalled();
      expect(result).toEqual({ sessionId: session.id, url: session.url });
    });

    it("doit lever une NotFoundException si la commande n'existe pas", async () => {
      // Arrange
      orderRepository.findById.mockResolvedValue(null); // Act & Assert

      await expect(
        paymentService.createCheckoutSession(
          "non-existent-id",
          mockAdminUserForPayment
        )
      ).rejects.toThrow(NotFoundException);
    });

    it("doit lever une ForbiddenException si un admin paie pour une commande d'une autre compagnie", async () => {
      // Arrange
      const orderFromAnotherCompany = { ...mockOrder, company_id: "company-B" };
      orderRepository.findById.mockResolvedValue(orderFromAnotherCompany); // Act & Assert

      await expect(
        paymentService.createCheckoutSession(
          mockOrder.order_id,
          mockAdminUserForPayment
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it("doit lever une ForbiddenException si l'utilisateur n'est pas un admin", async () => {
      // Arrange
      const nonAdminUser = { ...mockAdminUserForPayment, role: "technician" }; // Act & Assert

      await expect(
        paymentService.createCheckoutSession(mockOrder.order_id, nonAdminUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it("doit lever une NotFoundException si l'offre associée à la commande n'est pas trouvée", async () => {
      // Arrange
      orderRepository.findById.mockResolvedValue(mockOrder);
      offerRepository.findById.mockResolvedValue(null); // L'offre est introuvable // Act & Assert

      await expect(
        paymentService.createCheckoutSession(
          mockOrder.order_id,
          mockAdminUserForPayment
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("queuePaymentWebhook", () => {
    const mockEvent = {
      id: "evt_123",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_123",
          payment_intent: "pi_123",
          amount_total: 10000,
          metadata: {
            orderId: mockOrder.order_id,
            companyId: mockCompany.company_id,
          },
        },
      },
    };

    it("doit appeler directement processSuccessfulPayment en environnement de test", async () => {
      orderRepository.updateStatus.mockResolvedValue(mockOrder);
      offerRepository.findById.mockResolvedValue(mockOffer);
      licenseService.createLicenseForOrder.mockResolvedValue(mockLicense);
      companyRepository.findById.mockResolvedValue(mockCompany);

      await paymentService.queuePaymentWebhook(mockEvent);

      expect(orderRepository.updateStatus).toHaveBeenCalledWith(
        mockOrder.order_id,
        "completed",
        mockClient
      );
      expect(jobRepository.create).not.toHaveBeenCalled();
    });

    it("doit lever une ConflictException si l'événement a déjà été traité (mode production)", async () => {
      process.env.NODE_ENV = "production";
      const duplicateError = new Error(
        "duplicate key value violates unique constraint"
      );
      duplicateError.code = "23505";
      processedWebhookRepository.create.mockRejectedValue(duplicateError);

      await expect(
        paymentService.queuePaymentWebhook(mockEvent)
      ).rejects.toThrow(ConflictException);
      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
      expect(jobRepository.create).not.toHaveBeenCalled();

      process.env.NODE_ENV = "test"; // Revenir à l'état initial
    });
  });

  describe("processSuccessfulPayment", () => {
    const mockSession = {
      metadata: { orderId: mockOrder.order_id },
      payment_intent: "pi_123",
      amount_total: 10000,
    };

    it("doit exécuter toutes les étapes dans une transaction et retourner un succès", async () => {
      orderRepository.updateStatus.mockResolvedValue(mockOrder);
      offerRepository.findById.mockResolvedValue(mockOffer);
      licenseService.createLicenseForOrder.mockResolvedValue(mockLicense);
      companyRepository.findById.mockResolvedValue(mockCompany);
      generateInvoicePdf.mockResolvedValue(Buffer.from("pdf"));

      const result = await paymentService.processSuccessfulPayment(mockSession);

      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
      expect(emailService.sendLicenseAndInvoice).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.license).toBeInstanceOf(LicenseDto);
    });

    it("doit réussir même si l'envoi d'email échoue après la transaction", async () => {
      orderRepository.updateStatus.mockResolvedValue(mockOrder);
      offerRepository.findById.mockResolvedValue(mockOffer);
      licenseService.createLicenseForOrder.mockResolvedValue(mockLicense);
      companyRepository.findById.mockResolvedValue(mockCompany);
      generateInvoicePdf.mockResolvedValue(Buffer.from("pdf"));
      emailService.sendLicenseAndInvoice.mockRejectedValue(
        new Error("SMTP error")
      );

      const result = await paymentService.processSuccessfulPayment(mockSession);

      expect(mockClient.query).toHaveBeenCalledWith("COMMIT"); // La transaction doit réussir
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining("Échec de l'envoi de l'email")
      );
      expect(result.success).toBe(true); // Le paiement est considéré comme réussi globalement
    });
    it("doit réussir même si la compagnie n'est pas trouvée après la transaction", async () => {
      // Arrange
      orderRepository.updateStatus.mockResolvedValue(mockOrder);
      offerRepository.findById.mockResolvedValue(mockOffer);
      licenseService.createLicenseForOrder.mockResolvedValue(mockLicense);
      companyRepository.findById.mockResolvedValue(null); // La compagnie est introuvable // Act

      const result = await paymentService.processSuccessfulPayment(mockSession); // Assert

      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
      expect(generateInvoicePdf).not.toHaveBeenCalled(); // Le PDF ne peut être généré
      expect(emailService.sendLicenseAndInvoice).not.toHaveBeenCalled(); // L'email ne peut être envoyé
      expect(result.success).toBe(true);
    });
  });
});
