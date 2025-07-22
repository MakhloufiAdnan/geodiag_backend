import authService from '../services/authService.js';

/**
 * @file Gère les requêtes HTTP pour l'authentification.
 * @description Ce contrôleur utilise des fonctions fléchées pour garantir que `this`
 * est correctement lié à l'instance de la classe lorsqu'il est utilisé comme
 * gestionnaire de route Express.
 * @class AuthController
 */
class AuthController {
    /**
     * @private
     */
    #sendRefreshTokenCookie(res, token) {
        res.cookie('refreshToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
            path: '/api/auth'
        });
    }

    /**
     * Gère la connexion d'un administrateur de compagnie.
     */
    loginCompany = async (req, res, next) => { 
        try {
            const { email, password } = req.body;
            const { user, accessToken, refreshToken } = await authService.loginCompanyAdmin(email, password);

            this.#sendRefreshTokenCookie(res, refreshToken);

            res.status(200).json({ accessToken, user });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Gère la connexion d'un technicien.
     */
    loginTechnician = async (req, res, next) => { 
        try {
            const { email, password } = req.body;
            const { user, accessToken, refreshToken } = await authService.loginTechnician(email, password);

            this.#sendRefreshTokenCookie(res, refreshToken);

            res.status(200).json({ accessToken, user });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Gère le rafraîchissement de l'accessToken.
     */
    refresh = async (req, res, next) => {
        try {
            const oldRefreshToken = req.cookies.refreshToken;
            const { accessToken, refreshToken: newRefreshToken } = await authService.refreshTokens(oldRefreshToken);

            this.#sendRefreshTokenCookie(res, newRefreshToken);
            res.status(200).json({ accessToken });
        } catch (error) {
            res.clearCookie('refreshToken', { path: '/api/auth' });
            next(error);
        }
    }

    /**
     * Gère la déconnexion de l'utilisateur.
     */
    logout = async (req, res, next) => { 
        try {
            const refreshToken = req.cookies.refreshToken;
            await authService.logout(refreshToken);

            res.clearCookie('refreshToken', { path: '/api/auth' });
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

export default new AuthController();