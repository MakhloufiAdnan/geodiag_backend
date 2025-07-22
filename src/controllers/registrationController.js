import registrationService from '../services/registrationService.js';

/**
 * @file Gère la requête HTTP pour l'inscription d'une nouvelle compagnie.
 * @description Ce contrôleur orchestre le processus d'inscription et initialise
 * la session utilisateur de manière sécurisée en utilisant des cookies HttpOnly.
 * @class RegistrationController
 */
class RegistrationController {
    
    /**
     * Gère la création d'une compagnie et de son administrateur, puis établit une session sécurisée.
     * @description Utilise une fonction fléchée pour garantir que le contexte `this` est
     * correctement lié lors de l'appel par le routeur Express.
     * @type {import('express').RequestHandler}
     */
    registerCompany = async (req, res, next) => {
        try {

            // 1. Appeler le service pour créer les entités et générer les jetons.
            // Le service retourne un objet complet incluant le refreshToken.
            const { user, company, accessToken, refreshToken } = await registrationService.registerCompany(req.body);

            // 2. Envoyer le refreshToken dans un cookie HttpOnly sécurisé.
            // Mesure de sécurité essentielle pour protéger le jeton contre les attaques XSS.
            res.cookie('refreshToken', refreshToken, {

                httpOnly: true, // Le cookie n'est pas accessible via le JavaScript du client.
                secure: process.env.NODE_ENV === 'production', // N'envoye le cookie que sur une connexion HTTPS.
                sameSite: 'strict', // Protection contre les attaques CSRF.
                maxAge: 7 * 24 * 60 * 60 * 1000, // Durée de vie de 7 jours, cohérente avec le jeton.
                path: '/api/auth' // Le navigateur n'enverra ce cookie que sur les routes d'authentification.
            });

            // 3. Ne renvoye que les données non sensibles (accessToken, utilisateur, compagnie) dans le corps de la réponse JSON.
            res.status(201).json({ accessToken, user, company });
        } catch (error) {
            
            // 4. En cas d'erreur, la passer au gestionnaire d'erreurs centralisé.
            next(error);
        }
    }
}

export default new RegistrationController();