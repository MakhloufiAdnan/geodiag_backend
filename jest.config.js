/**
 * @file Configuration centrale pour le framework de test Jest.
 * @see https://jestjs.io/docs/configuration
 * @type {import('jest').Config}
 */
const config = {
  /**
   * Un script qui s'exécute une seule fois avant le lancement de toutes les suites de test.
   */
  globalSetup: './tests/jest/jest.setup.js',

  /**
   * Un script qui s'exécute une seule fois après la fin de toutes les suites de test.
   */
  globalTeardown: './tests/jest/jest.teardown.js',

  /**
   * Indique que le dossier courant est la racine du projet.
   */
  rootDir: '.',

  /**
   * Configuration pour la transformation des fichiers.
   * Vide ici car nous utilisons les modules ES6 nativement avec Node.js.
   */
  transform: {},

  /**
   * @description Crée des alias pour les chemins d'importation.
   * Cela résout les problèmes de chemins relatifs complexes (ex: ../../../)
   */
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@mocks/(.*)$': '<rootDir>/mocks/$1',
  },
};

export default config;
