/**
 * @file Configuration centrale pour le framework de test Jest.
 * @description Cette version utilise le token <rootDir> de Jest pour construire
 * des chemins d'alias fiables, ce qui est la pratique standard.
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
   * @description Crée des alias pour les chemins d'importation en utilisant
   * le token <rootDir> de Jest pour une résolution de chemin robuste.
   */
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@mocks/(.*)$': '<rootDir>/mocks/$1',
  },
};

export default config;
