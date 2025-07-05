import companyService from '../services/companyService.js';

/**
 * Gère les requêtes HTTP pour l'entité "Company".
 * Chaque méthode délègue la logique métier au service (`companyService`)
 * et utilise un bloc try...catch pour passer les erreurs au gestionnaire
 * d'erreurs centralisé (`errorHandler`).
 */
class CompanyController {

    /**
     * Récupère la liste de toutes les entreprises.
     * @param {object} req - L'objet de la requête Express.
     * @param {object} res - L'objet de la réponse Express.
     * @param {function} next - La fonction middleware suivante.
     */
    async getAllCompanies(req, res, next) {
        try {
            const companies = await companyService.getAllCompanies();
            res.status(200).json(companies);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Récupère une entreprise spécifique par son ID.
     * @param {object} req - L'objet de la requête Express (req.params.id).
     * @param {object} res - L'objet de la réponse Express.
     * @param {function} next - La fonction middleware suivante.
     */
    async getCompanyById(req, res, next) {
        try {
            const company = await companyService.getCompanyById(req.params.id);
            if (!company) {
                // Si aucune entreprise n'est trouvée, renvoyer une erreur 404.
                return res.status(404).json({ message: "Company not found" });
            }
            res.status(200).json(company);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Crée une nouvelle entreprise.
     * Note : La validation des données d'entrée (req.body) est gérée
     * en amont par le middleware de validation Joi dans le fichier de routes
     * (`companyRoutes.js`), ce qui simplifie la logique de ce contrôleur.
     * @param {object} req - L'objet de la requête Express (req.body).
     * @param {object} res - L'objet de la réponse Express.
     * @param {function} next - La fonction middleware suivante.
     */
    async createCompany(req, res, next) {
        try {
            const newCompany = await companyService.createCompany(req.body);
            
            // Renvoie la nouvelle entreprise avec un statut 201 (Created).
            res.status(201).json(newCompany);
        } catch (error) {
            next(error);
        }
    }
}

// Exporte une instance unique du contrôleur (pattern Singleton).
export default new CompanyController();