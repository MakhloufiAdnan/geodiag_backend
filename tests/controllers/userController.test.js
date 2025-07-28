import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { NotFoundException } from '../../src/exceptions/ApiException.js';
import { UserDto } from '../../src/dtos/userDto.js';

/**
 * @file Tests unitaires pour UserController.
 * @description Cette suite teste l'unité UserController en isolant la couche de service.
 * Elle vérifie que le contrôleur appelle correctement le service et formate
 * les réponses HTTP comme attendu pour toutes les opérations CRUD.
 */

// 1. Mocker le service pour isoler le contrôleur
jest.unstable_mockModule('../../src/services/userService.js', () => ({
  default: {
    getAllUsers: jest.fn(),
    getUserById: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  },
}));

// 2. Importer les modules après le mock
const { default: userService } = await import(
  '../../src/services/userService.js'
);
const { default: userController } = await import(
  '../../src/controllers/userController.js'
);

describe('UserController', () => {
  let mockReq, mockRes, mockNext;
  beforeEach(() => {
    mockReq = {
      params: {},
      body: {},
      user: { userId: 'admin-id', role: 'admin' },
      pagination: { page: 1, limit: 15 },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('doit appeler le service et retourner une liste paginée', async () => {
      const serviceResult = { data: [{ email: 'test@test.com' }], meta: {} };
      userService.getAllUsers.mockResolvedValue(serviceResult);

      await userController.getAllUsers(mockReq, mockRes, mockNext);

      expect(userService.getAllUsers).toHaveBeenCalledWith(1, 15);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(serviceResult);
    });
  });

  describe('getUserById', () => {
    it("doit retourner un DTO si l'utilisateur est trouvé", async () => {
      const fakeUser = { user_id: 'uuid-123', email: 'test@test.com' };
      mockReq.params.id = 'uuid-123';
      userService.getUserById.mockResolvedValue(fakeUser);

      await userController.getUserById(mockReq, mockRes, mockNext);

      expect(userService.getUserById).toHaveBeenCalledWith(
        'uuid-123',
        mockReq.user
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(new UserDto(fakeUser));
    });

    it('doit appeler next(error) si le service lève une NotFoundException', async () => {
      const notFoundError = new NotFoundException('Utilisateur non trouvé.');
      mockReq.params.id = 'uuid-inconnu';
      userService.getUserById.mockRejectedValue(notFoundError);

      await userController.getUserById(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(notFoundError);
    });
  });

  // Tests pour createUser
  describe('createUser', () => {
    it('doit retourner 201 et le nouveau DTO utilisateur', async () => {
      const fakeUser = { user_id: 'uuid-123', email: 'new@test.com' };
      mockReq.body = { email: 'new@test.com', password: 'pwd' };
      userService.createUser.mockResolvedValue(fakeUser);
      await userController.createUser(mockReq, mockRes, mockNext);
      expect(userService.createUser).toHaveBeenCalledWith(
        mockReq.body,
        mockReq.user
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(new UserDto(fakeUser));
    });
  });

  // Tests pour updateUser
  describe('updateUser', () => {
    it('doit retourner 200 et le DTO utilisateur mis à jour', async () => {
      const userId = 'uuid-123';
      const updatedData = { first_name: 'John' };
      const updatedUser = { user_id: userId, first_name: 'John' };
      mockReq.params.id = userId;
      mockReq.body = updatedData;
      userService.updateUser.mockResolvedValue(updatedUser);
      await userController.updateUser(mockReq, mockRes, mockNext);
      expect(userService.updateUser).toHaveBeenCalledWith(
        userId,
        updatedData,
        mockReq.user
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(new UserDto(updatedUser));
    });

    it('doit appeler next(error) si le service lève une NotFoundException', async () => {
      // Arrange
      const notFoundError = new NotFoundException('Utilisateur non trouvé.');
      mockReq.params.id = 'uuid-inconnu';
      mockReq.body = { first_name: 'Test' };
      userService.updateUser.mockRejectedValue(notFoundError);

      // Act
      await userController.updateUser(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(notFoundError);
    });
  });

  // Tests pour deleteUser
  describe('deleteUser', () => {
    it('doit retourner 204 si la suppression réussit', async () => {
      mockReq.params.id = 'uuid-123';
      userService.deleteUser.mockResolvedValue(undefined);

      await userController.deleteUser(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });
  });

  // Test générique pour la gestion d'erreur
  it('doit appeler next(error) si le service lève une erreur', async () => {
    const fakeError = new Error('Erreur de service');
    userService.getAllUsers.mockRejectedValue(fakeError);
    await userController.getAllUsers(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(fakeError);
  });
});
