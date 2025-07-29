import { jest } from "@jest/globals";

/**
 * @file Mock manuel pour la librairie Stripe.
 * @description Ce fichier est conçu pour être utilisé par les tests afin de simuler
 * le comportement de la librairie Stripe.
 */
export const mockCheckoutSession = {
  id: "cs_test_e2e_flow",
  url: "https://checkout.stripe.com/mock-e2e-url",
  payment_intent: "pi_test_e2e_flow",
  amount_total: 15000, // en centimes
  metadata: {},
};

const stripeMock = jest.fn().mockImplementation(() => ({
  checkout: {
    sessions: {
      create: jest.fn().mockResolvedValue(mockCheckoutSession),
    },
  },
}));

// Attacher les méthodes statiques au constructeur mocké
stripeMock.webhooks = {
  constructEvent: jest.fn((payload, _sig, _secret) => {
    // En conditions de test réelles, le payload est un Buffer
    if (Buffer.isBuffer(payload)) {
      return JSON.parse(payload.toString());
    }
    return JSON.parse(payload);
  }),
};

export default stripeMock;
