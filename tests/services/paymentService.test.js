import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  ForbiddenException,
  NotFoundException,
  ApiException,
  ConflictException,
} from '../../src/exceptions/ApiException.js';
import { LicenseDto } from '../../src/dtos/licenseDto.js';
import {
  mockAdminUser,
  mockOrder,
  mockOffer,
  mockCompany,
  mockLicense,
} from '../../mocks/mockData.js';

/**
 * @file Tests unitaires pour le PaymentService.
 * @description Ce fichier valide la logique métier liée aux paiements, en simulant
 * les dépendances externes (DB, Stripe, etc.) pour isoler et tester le service.
 */

// Simulation des dépendances externes
const mockStripeCheckoutSessionsCreate = jest.fn();
jest.unstable_mockModule('stripe', () => ({
  default: jest.fn(() => ({
    checkout: { sessions: { create: mockStripeCheckoutSessionsCreate } },
  })),
}));

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};
jest.unstable_mockModule('../../src/db/index.js', () => ({
  pool: {
    connect: jest.fn().mockResolvedValue(mockClient),
  },
}));

// Mock pour pg-boss
const mockBossSend = jest.fn();
jest.unstable_mockModule('../../src/worker/index.js', () => ({
  default: { send: mockBossSend },
}));

// Déclaration des fonctions mockées pour les repositories et services
const mockOrderRepositoryFindById = jest.fn();
const mockOrderRepositoryUpdateStatus = jest.fn();
const mockPaymentRepositoryCreate = jest.fn();
const mockCompanyRepositoryFindById = jest.fn();
const mockOfferRepositoryFindById = jest.fn();
const mockProcessedWebhookRepositoryCreate = jest.fn();
const mockLicenseServiceCreateLicenseForOrder = jest.fn();
const mockEmailServiceSendLicenseAndInvoice = jest.fn();
const mockGenerateInvoicePdf = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

jest.unstable_mockModule('../../src/repositories/orderRepository.js', () => ({
  default: {
    findById: mockOrderRepositoryFindById,
    updateStatus: mockOrderRepositoryUpdateStatus,
  },
}));
jest.unstable_mockModule('../../src/repositories/paymentRepository.js', () => ({
  default: { create: mockPaymentRepositoryCreate },
}));
jest.unstable_mockModule('../../src/repositories/companyRepository.js', () => ({
  default: { findById: mockCompanyRepositoryFindById },
}));
jest.unstable_mockModule('../../src/repositories/offerRepository.js', () => ({
  default: { findById: mockOfferRepositoryFindById },
}));
jest.unstable_mockModule(
  '../../src/repositories/processedWebhookRepository.js',
  () => ({ default: { create: mockProcessedWebhookRepositoryCreate } })
);
jest.unstable_mockModule('../../src/services/licenseService.js', () => ({
  default: { createLicenseForOrder: mockLicenseServiceCreateLicenseForOrder },
}));
jest.unstable_mockModule('../../src/services/emailService.js', () => ({
  default: { sendLicenseAndInvoice: mockEmailServiceSendLicenseAndInvoice },
}));
jest.unstable_mockModule('../../src/utils/pdfGenerator.js', () => ({
  generateInvoicePdf: mockGenerateInvoicePdf,
}));
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

// Imports dynamiques après la configuration des mocks
const { default: paymentService } = await import(
  '../../src/services/paymentService.js'
);

/**
 * Suite de tests pour le service de paiement (PaymentService).
 * @module PaymentServiceTests
 */
describe('PaymentService', () => {
  /**
   * Utilisateur administrateur mocké avec companyId en camelCase pour les tests.
   * @type {object}
   */
  const mockAdminUserForPayment = {
    ...mockAdminUser,
    companyId: mockAdminUser.company_id,
  };

  /**
   * Espion Jest pour la méthode `processSuccessfulPayment` du service.
   * Permet de vérifier si la méthode a été appelée et avec quels arguments.
   * @type {jest.SpyInstance}
   */
  let spyOnProcessSuccessfulPayment;

  /**
   * Exécuté avant chaque test.
   * Réinitialise les mocks et configure l'environnement de test.
   */
  beforeEach(() => {
    // Arrange: Réinitialiser tous les mocks avant chaque test
    jest.clearAllMocks();
    mockClient.query.mockImplementation((sql) => {
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql))
        return Promise.resolve();
      return Promise.resolve({ rows: [] });
    });

    process.env.NODE_ENV = 'test';

    // Arrange: Initialiser les mocks des méthodes des repositories et services avec les fonctions directes
    mockOrderRepositoryFindById.mockResolvedValue(mockOrder);
    mockOrderRepositoryUpdateStatus.mockResolvedValue(mockOrder);
    mockPaymentRepositoryCreate.mockResolvedValue({});
    mockCompanyRepositoryFindById.mockResolvedValue(mockCompany);
    mockOfferRepositoryFindById.mockResolvedValue(mockOffer);
    mockProcessedWebhookRepositoryCreate.mockResolvedValue({});
    mockLicenseServiceCreateLicenseForOrder.mockResolvedValue(mockLicense);
    mockEmailServiceSendLicenseAndInvoice.mockResolvedValue({});
    mockGenerateInvoicePdf.mockResolvedValue(Buffer.from('pdf'));
    mockLoggerInfo.mockClear();
    mockLoggerWarn.mockClear();
    mockLoggerError.mockClear();
    mockBossSend.mockClear();

    // Arrange: Espionner la méthode processSuccessfulPayment du service
    spyOnProcessSuccessfulPayment = jest.spyOn(
      paymentService,
      'processSuccessfulPayment'
    );
  });

  /**
   * Exécuté après chaque test.
   * Restaure l'espion pour éviter les interférences entre les tests.
   */
  afterEach(() => {
    // Arrange: Restaurer l'espion après chaque test pour éviter les interférences
    if (spyOnProcessSuccessfulPayment) {
      // Vérifier si l'espion a été défini
      spyOnProcessSuccessfulPayment.mockRestore();
    }
  });

  /**
   * Suite de tests pour la méthode `createCheckoutSession`.
   * @memberof PaymentServiceTests
   */
  describe('createCheckoutSession', () => {
    /**
     * Teste la création réussie d'une session de paiement Stripe.
     * @test
     */
    it('doit créer et retourner une session de paiement en cas de succès', async () => {
      // Arrange
      const session = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/...',
      };
      mockStripeCheckoutSessionsCreate.mockResolvedValue(session);

      // Act
      const result = await paymentService.createCheckoutSession(
        mockOrder.order_id,
        mockAdminUserForPayment
      );

      // Assert
      expect(mockOrderRepositoryFindById).toHaveBeenCalledWith(
        mockOrder.order_id
      );
      expect(mockOfferRepositoryFindById).toHaveBeenCalledWith(
        mockOrder.offer_id
      );
      expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalled();
      expect(result).toEqual({ sessionId: session.id, url: session.url });
    });

    /**
     * Teste la levée d'une `NotFoundException` si la commande n'existe pas.
     * @test
     */
    it("doit lever une NotFoundException si la commande n'existe pas", async () => {
      // Arrange
      mockOrderRepositoryFindById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        paymentService.createCheckoutSession(
          'non-existent-id',
          mockAdminUserForPayment
        )
      ).rejects.toThrow(NotFoundException);
    });

    /**
     * Teste la levée d'une `ForbiddenException` si un administrateur tente de payer
     * pour une commande appartenant à une autre compagnie.
     * @test
     */
    it("doit lever une ForbiddenException si un admin paie pour une commande d'une autre compagnie", async () => {
      // Arrange
      const orderFromAnotherCompany = { ...mockOrder, company_id: 'company-B' };
      mockOrderRepositoryFindById.mockResolvedValue(orderFromAnotherCompany);

      // Act & Assert
      await expect(
        paymentService.createCheckoutSession(
          mockOrder.order_id,
          mockAdminUserForPayment
        )
      ).rejects.toThrow(ForbiddenException);
    });

    /**
     * Teste la levée d'une `ForbiddenException` si l'utilisateur n'est pas un administrateur.
     * @test
     */
    it("doit lever une ForbiddenException si l'utilisateur n'est pas un admin", async () => {
      // Arrange
      const nonAdminUser = { ...mockAdminUserForPayment, role: 'technician' };

      // Act & Assert
      await expect(
        paymentService.createCheckoutSession(mockOrder.order_id, nonAdminUser)
      ).rejects.toThrow(ForbiddenException);
    });

    /**
     * Teste la levée d'une `NotFoundException` si l'offre associée à la commande n'est pas trouvée.
     * @test
     */
    it("doit lever une NotFoundException si l'offre associée à la commande n'est pas trouvée", async () => {
      // Arrange
      mockOrderRepositoryFindById.mockResolvedValue(mockOrder);
      mockOfferRepositoryFindById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        paymentService.createCheckoutSession(
          mockOrder.order_id,
          mockAdminUserForPayment
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  /**
   * Suite de tests pour la méthode `queuePaymentWebhook`.
   * @memberof PaymentServiceTests
   */
  describe('queuePaymentWebhook', () => {
    /**
     * Objet mocké pour un événement Stripe `checkout.session.completed`.
     * @type {object}
     */
    const mockEventCompleted = {
      id: 'evt_123_completed',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_123',
          payment_intent: 'pi_123',
          amount_total: 10000,
          metadata: {
            orderId: mockOrder.order_id,
            companyId: mockCompany.company_id,
          },
        },
      },
    };

    /**
     * Objet mocké pour un autre type d'événement Stripe.
     * @type {object}
     */
    const mockEventOther = {
      id: 'evt_123_other',
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'inv_123',
          amount_paid: 5000,
        },
      },
    };

    /**
     * Teste l'appel direct à `processSuccessfulPayment` en environnement de test
     * pour un événement `checkout.session.completed`.
     * @test
     */
    it('doit appeler directement processSuccessfulPayment en environnement de test pour un événement completed', async () => {
      // Arrange (NODE_ENV est déjà 'test' par beforeEach)

      // Act
      await paymentService.queuePaymentWebhook(mockEventCompleted);

      // Assert
      expect(spyOnProcessSuccessfulPayment).toHaveBeenCalledWith(
        mockEventCompleted.data.object
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Environnement de test détecté. Traitement synchrone du webhook.'
      );
      expect(mockBossSend).not.toHaveBeenCalled();
    });

    /**
     * Teste que rien ne se passe en environnement de test si l'événement Stripe
     * n'est pas de type `checkout.session.completed`.
     * @test
     */
    it("ne doit rien faire en environnement de test si l'événement n'est pas completed", async () => {
      // Arrange (NODE_ENV est déjà 'test' par beforeEach)

      // Act
      await paymentService.queuePaymentWebhook(mockEventOther);

      // Assert
      expect(mockProcessedWebhookRepositoryCreate).not.toHaveBeenCalled();
      expect(mockBossSend).not.toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Environnement de test détecté. Traitement synchrone du webhook.'
      );
      expect(spyOnProcessSuccessfulPayment).not.toHaveBeenCalled();
    });

    /**
     * Teste la levée d'une `ConflictException` si l'événement webhook a déjà été traité
     * (simule une violation de contrainte unique en mode production).
     * @test
     */
    it("doit lever une ConflictException si l'événement a déjà été traité (mode production)", async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const duplicateError = new Error(
        'duplicate key value violates unique constraint'
      );
      duplicateError.code = '23505';
      mockProcessedWebhookRepositoryCreate.mockRejectedValue(duplicateError);

      // Act & Assert
      await expect(
        paymentService.queuePaymentWebhook(mockEventCompleted)
      ).rejects.toThrow(ConflictException);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockBossSend).not.toHaveBeenCalled();
    });

    /**
     * Teste la relance d'une erreur générique si `processedWebhookRepository.create` échoue
     * avec une erreur autre qu'une violation de contrainte unique en mode production.
     * @test
     */
    it('doit relancer une erreur générique si processedWebhookRepository.create échoue avec une autre erreur (mode production)', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const genericError = new Error('Database connection lost');
      genericError.code = '50000';
      mockProcessedWebhookRepositoryCreate.mockRejectedValue(genericError);

      // Act & Assert
      await expect(
        paymentService.queuePaymentWebhook(mockEventCompleted)
      ).rejects.toThrow(genericError);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockBossSend).not.toHaveBeenCalled();
    });

    /**
     * Teste la mise en file d'attente d'une tâche pour `processSuccessfulPayment`
     * via `pg-boss` en mode production.
     * @test
     */
    it("doit mettre en file d'attente une tâche pour processSuccessfulPayment en mode production", async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      mockProcessedWebhookRepositoryCreate.mockResolvedValue({});
      mockBossSend.mockResolvedValue({});

      // Act
      await paymentService.queuePaymentWebhook(mockEventCompleted);

      // Assert
      expect(mockProcessedWebhookRepositoryCreate).toHaveBeenCalledWith(
        mockEventCompleted.id,
        expect.any(Object)
      );
      expect(mockBossSend).toHaveBeenCalledWith(
        'process_successful_payment',
        mockEventCompleted.data.object,
        {},
        expect.any(Object)
      );
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    /**
     * Teste l'enregistrement du webhook sans mise en file d'attente de tâche
     * si l'événement n'est pas `checkout.session.completed` en mode production.
     * @test
     */
    it("doit enregistrer le webhook mais ne pas mettre de tâche en file d'attente si l'événement n'est pas completed (mode production)", async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      mockProcessedWebhookRepositoryCreate.mockResolvedValue({});

      // Act
      await paymentService.queuePaymentWebhook(mockEventOther);

      // Assert
      expect(mockProcessedWebhookRepositoryCreate).toHaveBeenCalledWith(
        mockEventOther.id,
        expect.any(Object)
      );
      expect(mockBossSend).not.toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        { eventId: mockEventOther.id, eventType: mockEventOther.type },
        "Événement mis en file d'attente avec succès."
      );
    });
  });

  /**
   * Suite de tests pour la méthode `processSuccessfulPayment`.
   * @memberof PaymentServiceTests
   */
  describe('processSuccessfulPayment', () => {
    /**
     * Objet session Stripe mocké pour un paiement réussi.
     * @type {object}
     */
    const mockSession = {
      metadata: { orderId: mockOrder.order_id },
      payment_intent: 'pi_123',
      amount_total: 10000,
    };

    /**
     * Teste l'exécution complète de toutes les étapes dans une transaction
     * et le retour d'un succès.
     * @test
     */
    it('doit exécuter toutes les étapes dans une transaction et retourner un succès', async () => {
      // Arrange (les mocks sont configurés par beforeEach pour un scénario réussi)

      // Act
      const result = await paymentService.processSuccessfulPayment(mockSession);

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockPaymentRepositoryCreate).toHaveBeenCalled();
      expect(mockOrderRepositoryUpdateStatus).toHaveBeenCalled();
      expect(mockOfferRepositoryFindById).toHaveBeenCalled();
      expect(mockLicenseServiceCreateLicenseForOrder).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockEmailServiceSendLicenseAndInvoice).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.license).toBeInstanceOf(LicenseDto);
    });

    /**
     * Teste que le paiement est considéré comme réussi même si l'envoi de l'email
     * de confirmation échoue après la transaction.
     * @test
     */
    it("doit réussir même si l'envoi d'email échoue après la transaction", async () => {
      // Arrange
      mockEmailServiceSendLicenseAndInvoice.mockRejectedValue(
        new Error('SMTP error')
      );

      // Act
      const result = await paymentService.processSuccessfulPayment(mockSession);

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining("Échec de l'envoi de l'email")
      );
      expect(result.success).toBe(true);
    });

    /**
     * Teste que le paiement est réussi et la transaction validée même si la
     * compagnie associée n'est pas trouvée après la transaction (l'email ne peut pas être envoyé).
     * @test
     */
    it("doit réussir même si la compagnie n'est pas trouvée après la transaction", async () => {
      // Arrange
      mockCompanyRepositoryFindById.mockResolvedValue(null);

      // Act
      const result = await paymentService.processSuccessfulPayment(mockSession);

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockGenerateInvoicePdf).not.toHaveBeenCalled();
      expect(mockEmailServiceSendLicenseAndInvoice).not.toHaveBeenCalled();
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        { companyId: mockOrder.company_id, orderId: mockOrder.order_id },
        "Compagnie non trouvée après paiement, l'email n'a pas pu être envoyé."
      );
      expect(result.success).toBe(true);
    });

    /**
     * Teste l'annulation de la transaction et la levée d'une `ApiException`
     * si la création du paiement échoue.
     * @test
     */
    it('doit annuler la transaction et lever une erreur si la création du paiement échoue', async () => {
      // Arrange
      const error = new Error('Erreur de base de données');
      mockPaymentRepositoryCreate.mockRejectedValue(error);

      // Act & Assert
      await expect(
        paymentService.processSuccessfulPayment(mockSession)
      ).rejects.toThrow(ApiException);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining(
          'Échec du traitement du paiement pour la commande.'
        )
      );
    });

    /**
     * Teste l'annulation de la transaction et la levée d'une `ApiException`
     * si la mise à jour du statut de commande échoue.
     * @test
     */
    it('doit annuler la transaction et lever une erreur si la mise à jour du statut de commande échoue', async () => {
      // Arrange
      mockOrderRepositoryUpdateStatus.mockRejectedValue(
        new Error('Erreur de mise à jour de commande')
      );

      // Act & Assert
      await expect(
        paymentService.processSuccessfulPayment(mockSession)
      ).rejects.toThrow(ApiException);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining(
          'Échec du traitement du paiement pour la commande.'
        )
      );
    });

    /**
     * Teste l'annulation de la transaction et la levée d'une `NotFoundException`
     * si l'offre associée à la commande n'est pas trouvée pendant la transaction.
     * @test
     */
    it("doit annuler la transaction et lever une erreur si l'offre associée n'est pas trouvée (dans la transaction)", async () => {
      // Arrange
      mockOfferRepositoryFindById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        paymentService.processSuccessfulPayment(mockSession)
      ).rejects.toThrow(NotFoundException);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining(
          'Échec du traitement du paiement pour la commande.'
        )
      );
    });

    /**
     * Teste l'annulation de la transaction et la levée d'une `ApiException`
     * si la création de la licence échoue.
     * @test
     */
    it('doit annuler la transaction et lever une erreur si la création de licence échoue', async () => {
      // Arrange
      mockLicenseServiceCreateLicenseForOrder.mockRejectedValue(
        new Error('Erreur de création de licence')
      );

      // Act & Assert
      await expect(
        paymentService.processSuccessfulPayment(mockSession)
      ).rejects.toThrow(ApiException);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining(
          'Échec du traitement du paiement pour la commande.'
        )
      );
    });

    /**
     * Teste la levée d'une `ApiException` générique si une erreur non gérée
     * se produit pendant le traitement du paiement.
     * @test
     */
    it('doit lever une ApiException si une erreur non gérée se produit', async () => {
      // Arrange
      const genericError = new Error('Quelque chose de terrible est arrivé');
      // Simuler une erreur à un point inattendu, par exemple avant la transaction
      mockPaymentRepositoryCreate.mockImplementation(() => {
        throw genericError;
      });

      let caughtError;
      // Act
      try {
        await paymentService.processSuccessfulPayment(mockSession);
      } catch (error) {
        caughtError = error;
      }

      // Assert
      expect(caughtError).toBeInstanceOf(ApiException);
      expect(caughtError.message).toBe(
        `Une erreur interne est survenue lors du traitement de la commande ${mockSession.metadata.orderId}.`
      );
      expect(caughtError.statusCode).toBe(500);

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining(
          'Échec du traitement du paiement pour la commande.'
        )
      );
    });
  });
});
