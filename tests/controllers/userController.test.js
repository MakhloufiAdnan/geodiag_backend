import { jest, describe, it, expect, beforeEach } from '@jest/globals';

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
const { default: userService } = await import('../../src/services/userService.js');
const { default: userController } = await import('../../src/controllers/userController.js');
const { UserDto } = await import('../../src/dtos/userDto.js');

describe('UserController', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { userId: 'admin-id', role: 'admin' },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(), // Pour le statut 204 de la suppression
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  // Tests pour getAllUsers
  describe('getAllUsers', () => {
    it('doit appeler le service et retourner une liste paginée de DTOs', async () => {
      const fakeUsers = { data: [{ user_id: 1, email: 'test@test.com' }], meta: {} };
      userService.getAllUsers.mockResolvedValue(fakeUsers);
      await userController.getAllUsers(mockReq, mockRes, mockNext);
      expect(userService.getAllUsers).toHaveBeenCalledWith(1, 10, mockReq.user);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.any(Array),
      }));
    });
  });

  // Tests pour getUserById
  describe('getUserById', () => {
    it('doit retourner un DTO si l\'utilisateur est trouvé', async () => {
      const fakeUser = { user_id: 'uuid-123', email: 'test@test.com' };
      mockReq.params.id = 'uuid-123';
      userService.getUserById.mockResolvedValue(fakeUser);
      await userController.getUserById(mockReq, mockRes, mockNext);
      expect(userService.getUserById).toHaveBeenCalledWith('uuid-123', mockReq.user);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(new UserDto(fakeUser));
    });

    it('doit retourner 404 si l\'utilisateur n\'est pas trouvé', async () => {
      mockReq.params.id = 'uuid-inconnu';
      userService.getUserById.mockResolvedValue(null);
      await userController.getUserById(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found' });
    });
  });

  // Tests pour createUser
  describe('createUser', () => {
      it('doit retourner 201 et le nouveau DTO utilisateur', async () => {
        const fakeUser = { user_id: 'uuid-123', email: 'new@test.com' };
        mockReq.body = { email: 'new@test.com', password: 'pwd' };
        userService.createUser.mockResolvedValue(fakeUser);
        await userController.createUser(mockReq, mockRes, mockNext);
        expect(userService.createUser).toHaveBeenCalledWith(mockReq.body, mockReq.user);
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
        expect(userService.updateUser).toHaveBeenCalledWith(userId, updatedData, mockReq.user);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(new UserDto(updatedUser));
    });

    it('doit retourner 404 si l\'utilisateur à mettre à jour n\'est pas trouvé', async () => {
        mockReq.params.id = 'uuid-inconnu';
        userService.updateUser.mockResolvedValue(null);
        await userController.updateUser(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found' });
    });
  });

  // Tests pour deleteUser
  describe('deleteUser', () => {
    it('doit retourner 204 si la suppression réussit', async () => {
        const userId = 'uuid-123';
        mockReq.params.id = userId;
        userService.deleteUser.mockResolvedValue({ user_id: userId }); // Le service renvoie l'objet supprimé
        await userController.deleteUser(mockReq, mockRes, mockNext);
        expect(userService.deleteUser).toHaveBeenCalledWith(userId, mockReq.user);
        expect(mockRes.status).toHaveBeenCalledWith(204);
        expect(mockRes.send).toHaveBeenCalled();
    });

    it('doit retourner 404 si l\'utilisateur à supprimer n\'est pas trouvé', async () => {
        mockReq.params.id = 'uuid-inconnu';
        userService.deleteUser.mockResolvedValue(null);
        await userController.deleteUser(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found' });
    });
  });

  // Test générique pour la gestion d'erreur
  it('doit appeler next(error) si le service lève une erreur', async () => {
    const fakeError = new Error("Erreur de service");
    userService.getAllUsers.mockRejectedValue(fakeError);
    await userController.getAllUsers(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(fakeError);
  });
});