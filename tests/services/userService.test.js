import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import {
  NotFoundException,
  ConflictException,
} from "../../src/exceptions/apiException.js";
import { mockUser } from "../../mocks/mockData.js";

/**
 * @file Tests unitaires pour le UserService.
 * @description Cette suite de tests valide la logique métier du service en isolant
 * complètement ses dépendances. Chaque test suit le pattern Arrange-Act-Assert.
 */

jest.unstable_mockModule("../../src/repositories/userRepository.js", () => ({
  default: {
    findAll: jest.fn(),
    countAll: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.unstable_mockModule("bcrypt", () => ({
  default: {
    hash: jest.fn(),
  },
}));

const { default: userRepository } = await import(
  "../../src/repositories/userRepository.js"
);
const { default: bcrypt } = await import("bcrypt");
const { default: userService } = await import(
  "../../src/services/userService.js"
);

describe("UserService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * @describe Suite de tests pour la méthode `createUser`.
   */
  describe("createUser", () => {
    const userData = { email: "test@test.com", password: "password123" };

    /**
     * @it Doit créer un utilisateur avec succès en hachant le mot de passe.
     */
    it("doit créer un utilisateur et hacher le mot de passe", async () => {
      // Arrange
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue("hashed_password");
      userRepository.create.mockResolvedValue({ id: 1, ...userData });

      // Act
      await userService.createUser(userData);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ password_hash: "hashed_password" })
      );
    });

    /**
     * @it Doit lever une ConflictException si l'email existe déjà.
     */
    it("doit lever une ConflictException si l'email existe déjà", async () => {
      // Arrange
      userRepository.findByEmail.mockResolvedValue({ email: "test@test.com" });
      const action = () => userService.createUser(userData);

      // Act & Assert
      await expect(action).rejects.toThrow(ConflictException);
    });
  });

  /**
   * @describe Suite de tests pour la méthode `getUserById`.
   */
  describe("getUserById", () => {
    /**
     * @it Doit retourner un utilisateur s'il est trouvé dans le repository.
     */
    it("doit retourner un utilisateur s'il est trouvé", async () => {
      // Arrange
      userRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserById(mockUser.userId);

      // Assert
      expect(userRepository.findById).toHaveBeenCalledWith(mockUser.userId);
      expect(result).toEqual(mockUser);
    });

    /**
     * @it Doit lever une NotFoundException si l'utilisateur n'est pas trouvé.
     */
    it("doit lever une NotFoundException si l'utilisateur n'existe pas", async () => {
      // Arrange
      userRepository.findById.mockResolvedValue(undefined);
      const action = () => userService.getUserById("non-existent-id");

      // Act & Assert
      await expect(action).rejects.toThrow(NotFoundException);
    });
  });

  /**
   * @describe Suite de tests pour la méthode `getAllUsers`.
   */
  describe("getAllUsers", () => {
    /**
     * @it Doit retourner une liste paginée d'utilisateurs.
     */
    it("doit retourner une liste paginée d'utilisateurs", async () => {
      // Arrange
      userRepository.findAll.mockResolvedValue([mockUser]);
      userRepository.countAll.mockResolvedValue(1);

      // Act
      const result = await userService.getAllUsers(1, 10);

      // Assert
      expect(userRepository.findAll).toHaveBeenCalledWith(10, 0);
      expect(result.data).toHaveLength(1);
      expect(result.metadata.totalItems).toBe(1);
    });
  });

  /**
   * @describe Suite de tests pour la méthode `updateUser`.
   */
  describe("updateUser", () => {
    const updateData = { first_name: "Updated Name" };

    /**
     * @it Doit appeler le repository pour mettre à jour un utilisateur.
     */
    it("doit mettre à jour un utilisateur", async () => {
      // Arrange
      userRepository.update.mockResolvedValue({ ...mockUser, ...updateData });

      // Act
      await userService.updateUser(mockUser.userId, updateData);

      // Assert
      expect(userRepository.update).toHaveBeenCalledWith(
        mockUser.userId,
        updateData
      );
    });

    /**
     * @it Doit lever une NotFoundException si l'utilisateur à mettre à jour n'existe pas.
     */
    it("doit lever une NotFoundException si l'utilisateur à mettre à jour n'existe pas", async () => {
      // Arrange
      userRepository.update.mockResolvedValue(null);
      const action = () => userService.updateUser("non-existent-id", {});

      // Act & Assert
      await expect(action).rejects.toThrow(NotFoundException);
    });
  });

  /**
   * @describe Suite de tests pour la méthode `deleteUser`.
   */
  describe("deleteUser", () => {
    /**
     * @it Doit appeler le repository pour supprimer un utilisateur.
     */
    it("doit supprimer un utilisateur", async () => {
      // Arrange
      userRepository.delete.mockResolvedValue(mockUser);

      // Act
      await userService.deleteUser(mockUser.userId);

      // Assert
      expect(userRepository.delete).toHaveBeenCalledWith(mockUser.userId);
    });

    /**
     * @it Doit lever une NotFoundException si l'utilisateur à supprimer n'existe pas.
     */
    it("doit lever une NotFoundException si l'utilisateur à supprimer n'existe pas", async () => {
      // Arrange
      userRepository.delete.mockResolvedValue(null);
      const action = () => userService.deleteUser("non-existent-id");

      // Act & Assert
      await expect(action).rejects.toThrow(NotFoundException);
    });
  });
});
