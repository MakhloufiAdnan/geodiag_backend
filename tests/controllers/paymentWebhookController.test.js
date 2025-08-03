/**
 * @file Tests unitaires pour PaymentWebhookController.
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ConflictException } from '../../src/exceptions/ApiException.js';

/**
 * @description Contrôleur pour la gestion des webhooks de paiement.
 * Gère la réception et la mise en file d'attente des événements de webhook.
 */

// Mock du service
jest.unstable_mockModule('../../src/services/paymentService.js', () => ({
  default: {
    queuePaymentWebhook: jest.fn(),
  },
}));

const { default: paymentService } = await import(
  '../../src/services/paymentService.js'
);
const { default: paymentWebhookController } = await import(
  '../../src/controllers/paymentWebhookController.js'
);

describe('PaymentWebhookController', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = { webhookEvent: { id: 'evt_123' } };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('doit appeler le service et renvoyer 200 en cas de succès', async () => {
    // Arrange
    paymentService.queuePaymentWebhook.mockResolvedValue();

    // Act
    await paymentWebhookController.handleWebhook(mockReq, mockRes, mockNext);

    // Assert
    expect(paymentService.queuePaymentWebhook).toHaveBeenCalledWith(
      mockReq.webhookEvent
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("doit renvoyer 200 même si l'événement est un doublon (ConflictException)", async () => {
    // Arrange
    const conflictError = new ConflictException('Événement déjà traité.');
    paymentService.queuePaymentWebhook.mockRejectedValue(conflictError);

    // Act
    await paymentWebhookController.handleWebhook(mockReq, mockRes, mockNext);

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      message: 'Événement en double ignoré.',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('doit appeler next(error) pour toute autre erreur de service', async () => {
    // Arrange
    const genericError = new Error('Erreur de base de données');
    paymentService.queuePaymentWebhook.mockRejectedValue(genericError);

    // Act
    await paymentWebhookController.handleWebhook(mockReq, mockRes, mockNext);

    // Assert
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledWith(genericError);
  });
});
