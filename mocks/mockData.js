/**
 * @file Fichier central pour les données de test (fixtures).
 * @description Exporte des objets standards qui simulent la structure des données
 * brutes retournées par les repositories (avec snake_case) et pour les tests d'intégration.
 */
import { v4 as uuidv4 } from 'uuid';
// Correction : Remplacement de l'alias par un chemin relatif pour une meilleure résolution par Jest.
import { ROLES } from '../src/config/constants.js';

// --- Données pour les Tests Unitaires ---

export const mockAdminUser = {
  user_id: uuidv4(),
  company_id: uuidv4(),
  role: ROLES.ADMIN,
  password_hash: 'hashed_password_for_admin',
};

export const mockTechnicianUser = {
  user_id: uuidv4(),
  company_id: mockAdminUser.company_id,
  role: ROLES.TECHNICIAN,
  password_hash: 'hashed_password_for_tech',
};

export const mockUser = {
  user_id: uuidv4(),
  role: ROLES.TECHNICIAN,
};

export const mockCompany = {
  company_id: mockAdminUser.company_id,
  name: 'Test Company',
  email: 'contact@testco.com',
  address: '123 Rue du Test',
};

export const mockOffer = {
  offer_id: uuidv4(),
  name: 'Offre Standard',
  description: "Description de l'offre standard pour les tests.",
  price: 150.0,
  duration_months: 12,
  is_public: true,
};

export const mockOrder = {
  order_id: uuidv4(),
  company_id: mockCompany.company_id,
  offer_id: mockOffer.offer_id,
  status: 'pending',
};

export const mockLicense = {
  license_id: uuidv4(),
  expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // expire dans 1 an
  qr_code_payload: `QR-${uuidv4()}`,
  order_id: mockOrder.order_id,
};

export const mockVehicle = {
  vehicle_id: uuidv4(),
  registration: 'AA-123-BB',
  vin: '1234567890ABCDEFG',
  brand: 'TestBrand',
  model: 'TestModel',
};

// --- Données pour les Tests d'Intégration et E2E ---

/**
 * @description Données complètes pour l'inscription d'une nouvelle compagnie (A) et de son admin.
 * Idéal pour les tests de la route /register.
 */
export const mockRegistrationData = {
  companyData: {
    name: 'Ma Super Compagnie E2E',
    email: 'contact@super-compagnie-e2e.com',
  },
  adminData: {
    first_name: 'Jean',
    last_name: 'Dupont',
    email: 'admin@super-compagnie-e2e.com',
    password: 'passwordSecure123!',
  },
};

/**
 * @description Données complètes pour l'inscription d'une seconde compagnie (B).
 * Utilisé pour les tests de sécurité et d'isolation des données.
 */
export const mockRegistrationDataCompanyB = {
  companyData: {
    name: 'Compagnie B E2E',
    email: 'contact@compagnie-b-e2e.com',
  },
  adminData: {
    first_name: 'Alice',
    last_name: 'Martin',
    email: 'admin@compagnie-b-e2e.com',
    password: 'passwordSecure456!',
  },
};

/**
 * @description Identifiants simples pour les tests de connexion.
 * Le mot de passe correspond à celui dans mockRegistrationData.
 */
export const mockLoginCredentials = {
  email: mockRegistrationData.adminData.email,
  password: mockRegistrationData.adminData.password,
};
