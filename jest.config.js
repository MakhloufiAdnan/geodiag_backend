/** @type {import('jest').Config} */
const config = {
    
    // Indique à Jest d'exécuter ce script une seule fois avant de lancer les tests.
    globalSetup: './tests/jest.setup.js',

    // Indique à Jest d'exécuter ce script une seule fois après la fin de tous les tests.
    globalTeardown: './tests/jest.teardown.js',
    
    // Jest arrêtera de chercher des configurations dans les dossiers parents.
    rootDir: '.',

    // Transformation nécessaire pour que Jest gère correctement les modules ES6.
    transform: {}, 
};

export default config;
