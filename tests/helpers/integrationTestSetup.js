import { beforeAll, afterAll } from '@jest/globals';
import { createTestApp } from './app.js';
import supertest from 'supertest';

/**
 * @file Met en place un environnement de test standard pour les tests d'intégration.
 * @description Crée une instance de serveur avant les tests de la suite et la ferme après.
 * Expose une variable `agent` pour effectuer les requêtes.
 */
export function setupIntegrationTest() {
  let server;
  let agent;

  beforeAll(async () => {
    const { app, server: localServer } = createTestApp();
    server = localServer;
    agent = supertest.agent(app);
  });

  afterAll(() => {
    return new Promise((resolve) => server.close(resolve));
  });

  // Retourne une fonction qui permet d'accéder à l'agent dans les tests
  return () => agent;
}
