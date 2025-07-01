export function errorHandler(err, req, res, next) {
    
    console.log('--- GESTIONNAIRE D\'ERREURS ATTRAPÉ ---');
    console.error(err);
    console.log('--- FIN DE L\'ERREUR ---');
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Une erreur est survenue sur le serveur';

    res.status(statusCode).json({ message });
}