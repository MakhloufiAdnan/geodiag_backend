/**
 * @file Configuration centrale pour le framework de test Jest.
 * @see https://jestjs.io/docs/configuration
 * @type {import('jest').Config}
 */
const config = {
    /**
     * Un script qui s'exécute une seule fois avant le lancement de toutes les suites de test.
     * Idéal pour initialiser un environnement de test (ex: créer une base de données de test).
     */
    globalSetup: './tests/jest.setup.js',

    /**
     * Un script qui s'exécute une seule fois après la fin de toutes les suites de test.
     * Idéal pour nettoyer l'environnement (ex: fermer les connexions à la base de données).
     */
    globalTeardown: './tests/jest.teardown.js',

    /**
     * Indique que le dossier courant est la racine du projet.
     */
    rootDir: '.',

    /**
     * Configuration pour la transformation des fichiers.
     * Vide ici car nous utilisons les modules ES6 nativement avec Node.js.
     */
    transform: {},
};

export default config;
