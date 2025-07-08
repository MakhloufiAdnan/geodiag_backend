import companyService from '../services/companyService.js';
import { CompanyDto } from '../dtos/companyDto.js';

/**
 * @file Gère les requêtes HTTP pour l'entité "Company".
 * @description Ce contrôleur délègue la logique métier au companyService et
 * passe systématiquement l'utilisateur authentifié pour la vérification des droits.
 */
class CompanyController {
    /**
     * Récupère la liste de toutes les compagnies.
     */
    async getAllCompanies(req, res, next) {
        try {
            const companies = await companyService.getAllCompanies(req.user);
            res.status(200).json(companies);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Récupère une compagnie spécifique par son ID.
     */
    async getCompanyById(req, res, next) {
        try {
            const company = await companyService.getCompanyById(req.params.id, req.user);
            if (!company) {
                return res.status(404).json({ message: "Company not found" });
            }
            res.status(200).json(company);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Crée une nouvelle compagnie.
     * Note : La création se fait via la route d'inscription dans la logique actuelle.
     * Cette méthode serait utilisée si un super-admin pouvait créer des compagnies.
     */
    async createCompany(req, res, next) {
        try {
            const newCompany = await companyService.createCompany(req.body, req.user);
            res.status(201).json(new CompanyDto(newCompany));
        } catch (error) {
            next(error);
        }
    }
}

export default new CompanyController();