import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  NotFoundException,
  ConflictException,
} from '../../src/exceptions/ApiException.js';
import { mockUser } from '../../mocks/mockData.js';

/**
 * @file Tests unitaires pour le UserService.
 * @description Cette suite de tests valide la logique métier du service en isolant
 * complètement ses dépendances. Chaque test suit le pattern Arrange-Act-Assert.
 */

// Mocker toutes les dépendances pour isoler le service
const mockUserRepositoryFindAll = jest.fn();
const mockUserRepositoryCountAll = jest.fn();
const mockUserRepositoryFindById = jest.fn();
const mockUserRepositoryFindByEmail = jest.fn();
const mockUserRepositoryCreate = jest.fn();
const mockUserRepositoryUpdate = jest.fn();
const mockUserRepositoryDelete = jest.fn();
const mockBcryptHash = jest.fn();

jest.unstable_mockModule('../../src/repositories/userRepository.js', () => ({
  default: {
    findAll: mockUserRepositoryFindAll,
    countAll: mockUserRepositoryCountAll,
    findById: mockUserRepositoryFindById,
    findByEmail: mockUserRepositoryFindByEmail,
    create: mockUserRepositoryCreate,
    update: mockUserRepositoryUpdate,
    delete: mockUserRepositoryDelete,
  },
}));
jest.unstable_mockModule('bcrypt', () => ({
  default: {
    hash: mockBcryptHash,
  },
}));

// Mock pour l'utilitaire de pagination
jest.unstable_mockModule('../../src/utils/paginationUtils.js', () => ({
  createPaginatedResponse: jest.fn((options) => ({
    data: options.data,
    metadata: {
      totalItems: options.totalItems,
      currentPage: options.page,
      itemsPerPage: options.limit,
      totalPages: Math.ceil(options.totalItems / options.limit),
    },
  })),
}));

// Import du service après la configuration de tous les mocks
const { default: userService } = await import(
  '../../src/services/userService.js'
);

/**
 * Suite de tests pour le service utilisateur (UserService).
 * @module UserServiceTests
 */
describe('UserService', () => {
  /**
   * Exécuté avant chaque test.
   * Réinitialise tous les mocks Jest.
   */
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Suite de tests pour la méthode `createUser`.
   * @memberof UserServiceTests
   */
  describe('createUser', () => {
    /**
     * Données utilisateur pour la création.
     * @type {object}
     */
    const userData = {
      email: 'test@test.com',
      password: 'password123',
      role: 'technician',
    };

    /**
     * Teste la création réussie d'un utilisateur avec hachage du mot de passe.
     * @test
     */
    it('doit créer un utilisateur et hacher le mot de passe', async () => {
      // Arrange
      mockUserRepositoryFindByEmail.mockResolvedValue(null); // L'email n'existe pas
      mockBcryptHash.mockResolvedValue('hashed_password');
      mockUserRepositoryCreate.mockResolvedValue({
        user_id: 'new-user-id',
        ...userData,
        password_hash: 'hashed_password',
      });

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(mockUserRepositoryFindByEmail).toHaveBeenCalledWith(
        userData.email
      );
      expect(mockBcryptHash).toHaveBeenCalledWith('password123', 10);
      expect(mockUserRepositoryCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userData.email,
          password_hash: 'hashed_password',
        })
      );
      expect(mockUserRepositoryCreate.mock.calls[0][0]).not.toHaveProperty(
        'password'
      ); // S'assurer que le mot de passe en clair est supprimé
      expect(result).toHaveProperty('user_id', 'new-user-id');
    });

    /**
     * Teste la levée d'une `ConflictException` si l'email existe déjà.
     * @test
     */
    it("doit lever une ConflictException si l'email existe déjà", async () => {
      // Arrange
      mockUserRepositoryFindByEmail.mockResolvedValue({
        email: 'test@test.com',
      }); // L'email existe déjà

      // Act & Assert
      await expect(userService.createUser(userData)).rejects.toThrow(
        ConflictException
      );
      expect(mockUserRepositoryFindByEmail).toHaveBeenCalledWith(
        userData.email
      );
      expect(mockBcryptHash).not.toHaveBeenCalled(); // Pas de hachage si l'email existe
      expect(mockUserRepositoryCreate).not.toHaveBeenCalled(); // Pas de création d'utilisateur
    });
  });

  /**
   * Suite de tests pour la méthode `getUserById`.
   * @memberof UserServiceTests
   */
  describe('getUserById', () => {
    /**
     * Teste la récupération réussie d'un utilisateur par ID.
     * @test
     */
    it("doit retourner un utilisateur s'il est trouvé", async () => {
      // Arrange
      mockUserRepositoryFindById.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserById(mockUser.user_id); // Utiliser user_id pour correspondre au mock

      // Assert
      expect(mockUserRepositoryFindById).toHaveBeenCalledWith(mockUser.user_id);
      expect(result).toEqual(mockUser);
    });

    /**
     * Teste la levée d'une `NotFoundException` si l'utilisateur n'est pas trouvé.
     * @test
     */
    it("doit lever une NotFoundException si l'utilisateur n'existe pas", async () => {
      // Arrange
      mockUserRepositoryFindById.mockResolvedValue(undefined);

      // Act & Assert
      await expect(userService.getUserById('non-existent-id')).rejects.toThrow(
        NotFoundException
      );
      expect(mockUserRepositoryFindById).toHaveBeenCalledWith(
        'non-existent-id'
      );
    });
  });

  /**
   * Suite de tests pour la méthode `getAllUsers`.
   * @memberof UserServiceTests
   */
  describe('getAllUsers', () => {
    /**
     * Teste la récupération réussie d'une liste paginée d'utilisateurs.
     * @test
     */
    it("doit retourner une liste paginée d'utilisateurs", async () => {
      // Arrange
      const page = 1;
      const limit = 10;
      mockUserRepositoryFindAll.mockResolvedValue([mockUser]);
      mockUserRepositoryCountAll.mockResolvedValue(1);

      // Act
      const result = await userService.getAllUsers(page, limit);

      // Assert
      expect(mockUserRepositoryFindAll).toHaveBeenCalledWith(
        limit,
        (page - 1) * limit
      );
      expect(mockUserRepositoryCountAll).toHaveBeenCalledTimes(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('userId', mockUser.user_id); // Vérifier le DTO
      expect(result.metadata.totalItems).toBe(1);
      expect(result.metadata.currentPage).toBe(page);
      expect(result.metadata.itemsPerPage).toBe(limit);
      expect(result.metadata.totalPages).toBe(Math.ceil(1 / limit));
    });

    /**
     * Teste la récupération d'une liste vide si aucun utilisateur n'est trouvé.
     * @test
     */
    it("doit retourner une liste vide si aucun utilisateur n'est trouvé", async () => {
      // Arrange
      const page = 1;
      const limit = 10;
      mockUserRepositoryFindAll.mockResolvedValue([]);
      mockUserRepositoryCountAll.mockResolvedValue(0);

      // Act
      const result = await userService.getAllUsers(page, limit);

      // Assert
      expect(mockUserRepositoryFindAll).toHaveBeenCalledWith(
        limit,
        (page - 1) * limit
      );
      expect(mockUserRepositoryCountAll).toHaveBeenCalledTimes(1);
      expect(result.data).toHaveLength(0);
      expect(result.metadata.totalItems).toBe(0);
    });
  });

  /**
   * Suite de tests pour la méthode `updateUser`.
   * @memberof UserServiceTests
   */
  describe('updateUser', () => {
    /**
     * Données de mise à jour pour un utilisateur.
     * @type {object}
     */
    const updateData = { first_name: 'Updated Name' };
    /**
     * Données de mise à jour incluant un email.
     * @type {object}
     */
    const updateDataWithEmail = { email: 'newemail@test.com' };

    /**
     * Teste la mise à jour réussie d'un utilisateur.
     * @test
     */
    it('doit mettre à jour un utilisateur', async () => {
      // Arrange
      mockUserRepositoryUpdate.mockResolvedValue({
        ...mockUser,
        ...updateData,
      });

      // Act
      const result = await userService.updateUser(mockUser.user_id, updateData);

      // Assert
      expect(mockUserRepositoryUpdate).toHaveBeenCalledWith(
        mockUser.user_id,
        updateData
      );
      expect(result).toEqual({ ...mockUser, ...updateData });
      expect(mockUserRepositoryFindByEmail).not.toHaveBeenCalled(); // Pas de vérification d'email si l'email n'est pas mis à jour
    });

    /**
     * Teste la mise à jour réussie d'un utilisateur avec un nouvel email non utilisé.
     * @test
     */
    it('doit mettre à jour un utilisateur avec un nouvel email non utilisé', async () => {
      // Arrange
      mockUserRepositoryFindByEmail.mockResolvedValue(null); // Le nouvel email n'est pas utilisé
      mockUserRepositoryUpdate.mockResolvedValue({
        ...mockUser,
        ...updateDataWithEmail,
      });

      // Act
      const result = await userService.updateUser(
        mockUser.user_id,
        updateDataWithEmail
      );

      // Assert
      expect(mockUserRepositoryFindByEmail).toHaveBeenCalledWith(
        updateDataWithEmail.email
      );
      expect(mockUserRepositoryUpdate).toHaveBeenCalledWith(
        mockUser.user_id,
        updateDataWithEmail
      );
      expect(result).toEqual({ ...mockUser, ...updateDataWithEmail });
    });

    /**
     * Teste la levée d'une `ConflictException` si le nouvel email est déjà utilisé par un autre compte.
     * @test
     */
    it('doit lever une ConflictException si le nouvel email est déjà utilisé par un autre compte', async () => {
      // Arrange
      const anotherUserWithEmail = { ...mockUser, user_id: 'another-user-id' };
      mockUserRepositoryFindByEmail.mockResolvedValue(anotherUserWithEmail); // L'email est utilisé par un autre user

      // Act & Assert
      await expect(
        userService.updateUser(mockUser.user_id, updateDataWithEmail)
      ).rejects.toThrow(ConflictException);
      expect(mockUserRepositoryFindByEmail).toHaveBeenCalledWith(
        updateDataWithEmail.email
      );
      expect(mockUserRepositoryUpdate).not.toHaveBeenCalled(); // Pas de mise à jour
    });

    /**
     * Teste la levée d'une `NotFoundException` si l'utilisateur à mettre à jour n'existe pas.
     * @test
     */
    it("doit lever une NotFoundException si l'utilisateur à mettre à jour n'existe pas", async () => {
      // Arrange
      mockUserRepositoryUpdate.mockResolvedValue(null);

      // Act & Assert
      await expect(
        userService.updateUser('non-existent-id', {})
      ).rejects.toThrow(NotFoundException);
      expect(mockUserRepositoryUpdate).toHaveBeenCalledWith(
        'non-existent-id',
        {}
      );
    });
  });

  /**
   * Suite de tests pour la méthode `deleteUser`.
   * @memberof UserServiceTests
   */
  describe('deleteUser', () => {
    /**
     * Teste la suppression réussie d'un utilisateur.
     * @test
     */
    it('doit supprimer un utilisateur', async () => {
      // Arrange
      mockUserRepositoryDelete.mockResolvedValue(mockUser);

      // Act
      const result = await userService.deleteUser(mockUser.user_id);

      // Assert
      expect(mockUserRepositoryDelete).toHaveBeenCalledWith(mockUser.user_id);
      expect(result).toEqual(mockUser);
    });

    /**
     * Teste la levée d'une `NotFoundException` si l'utilisateur à supprimer n'existe pas.
     * @test
     */
    it("doit lever une NotFoundException si l'utilisateur à supprimer n'existe pas", async () => {
      // Arrange
      mockUserRepositoryDelete.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.deleteUser('non-existent-id')).rejects.toThrow(
        NotFoundException
      );
      expect(mockUserRepositoryDelete).toHaveBeenCalledWith('non-existent-id');
    });
  });
});
