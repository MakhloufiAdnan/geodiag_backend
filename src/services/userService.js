import userRepository from '../repositories/userRepository.js';
import bcrypt from 'bcrypt';
import { UserDto } from '../dtos/userDto.js';
import { createPaginatedResponse } from '../utils/paginationUtils.js';
import {
  NotFoundException,
  ConflictException,
} from '../exceptions/ApiException.js';

/**
 * @file Gère la logique métier pour les utilisateurs (CRUD).
 * @description La vérification des autorisations (ex: rôle admin) est gérée en amont
 * par les middlewares REST ou les gardes GraphQL. Ce service se concentre uniquement
 * sur la logique métier, en supposant que l'accès a déjà été autorisé.
 * @class UserService
 */
class UserService {
  /**
   * Récupère une liste paginée d'utilisateurs.
   * @param {number} page - Le numéro de la page.
   * @param {number} limit - Le nombre d'éléments par page.
   * @returns {Promise<object>} Un objet de réponse paginée structuré.
   */
  async getAllUsers(page, limit) {
    const offset = (page - 1) * limit;

    const [users, totalItems] = await Promise.all([
      userRepository.findAll(limit, offset),
      userRepository.countAll(),
    ]);

    const userDtos = users.map((user) => new UserDto(user));

    return createPaginatedResponse({
      data: userDtos,
      totalItems,
      page,
      limit,
      baseUrl: '/api/users',
    });
  }

  /**
   * Récupère un utilisateur par son ID.
   * @param {string} id - L'ID de l'utilisateur à récupérer.
   * @returns {Promise<object>} L'objet utilisateur brut trouvé.
   * @throws {NotFoundException} Si aucun utilisateur n'est trouvé pour cet ID.
   */
  async getUserById(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé.');
    }
    return user;
  }

  /**
   * Crée un nouvel utilisateur.
   * @param {object} userData - Les données du nouvel utilisateur (email, password, etc.).
   * @returns {Promise<object>} Le nouvel utilisateur créé (données brutes).
   * @throws {ConflictException} Si l'email est déjà utilisé.
   */
  async createUser(userData) {
    const existingUser = await userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà.');
    }
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(userData.password, saltRounds);
    const newUser = { ...userData, password_hash };
    delete newUser.password;
    return userRepository.create(newUser);
  }

  /**
   * Met à jour un utilisateur existant.
   * @param {string} id - L'ID de l'utilisateur à mettre à jour.
   * @param {object} userData - Les données à mettre à jour.
   * @returns {Promise<object>} L'utilisateur mis à jour (données brutes).
   * @throws {ConflictException} Si le nouvel email est déjà utilisé par un autre compte.
   * @throws {NotFoundException} Si l'utilisateur à mettre à jour n'est pas trouvé.
   */
  async updateUser(id, userData) {
    if (userData.email) {
      const existingUser = await userRepository.findByEmail(userData.email);
      if (existingUser && existingUser.user_id !== id) {
        throw new ConflictException(
          'Cet email est déjà utilisé par un autre compte.'
        );
      }
    }
    const updatedUser = await userRepository.update(id, userData);
    if (!updatedUser) {
      throw new NotFoundException(
        'Utilisateur non trouvé pour la mise à jour.'
      );
    }
    return updatedUser;
  }

  /**
   * Supprime un utilisateur.
   * @param {string} id - L'ID de l'utilisateur à supprimer.
   * @returns {Promise<object>} L'utilisateur qui a été supprimé.
   * @throws {NotFoundException} Si l'utilisateur à supprimer n'est pas trouvé.
   */
  async deleteUser(id) {
    const deletedUser = await userRepository.delete(id);
    if (!deletedUser) {
      throw new NotFoundException(
        'Utilisateur non trouvé pour la suppression.'
      );
    }
    return deletedUser;
  }
}

export default new UserService();
