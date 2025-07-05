import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * @file Tests unitaires pour UserController
 * @description Cette suite teste l'unité UserController en isolant la couche de service.
 * Elle vérifie que le contrôleur appelle correctement le service et formate
 * les réponses HTTP comme attendu.
 */

// 1. Simulation de la couche de service pour isoler le contrôleur
jest.unstable_mockModule('../../src/services/userService.js', () => ({
    default: {
        getAllUsers: jest.fn(),
        getUserById: jest.fn(),
        createUser: jest.fn(),
        updateUser: jest.fn(),
        deleteUser: jest.fn(),
    },
}));

// 2. Importation des modules après la simulation
const { default: userService } = await import('../../src/services/userService.js');
const { default: userController } = await import('../../src/controllers/userController.js');
const { UserDto } = await import('../../src/dtos/userDto.js');

// 3. Suite de tests pour UserController
describe('UserController', () => {
    let mockReq, mockRes, mockNext;

    // Avant chaque test, réinitialisation des objets simulés de la requête
    beforeEach(() => {
        mockReq = {
            params: {},
            query: {},
            body: {},
            user: { userId: 'admin-id', role: 'admin' }, // Simule un utilisateur admin authentifié
        };
        mockRes = {
            status: jest.fn().mockReturnThis(), // Permet d'enchaîner .status().json()
            json: jest.fn(),
            send: jest.fn(),
        };
        mockNext = jest.fn(); // Simule la fonction next() pour le gestionnaire d'erreurs
        jest.clearAllMocks();
    });

    it('getAllUsers doit appeler le service et retourner une liste paginée de DTOs', async () => {
        // Préparation
        const fakeUsers = { data: [{ user_id: 1, email: 'test@test.com' }], meta: {} };
        userService.getAllUsers.mockResolvedValue(fakeUsers);

        // Action
        await userController.getAllUsers(mockReq, mockRes, mockNext);

        // Assertion
        expect(userService.getAllUsers).toHaveBeenCalledWith(1, 10, mockReq.user);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.any(Array),
        }));
    });

    it('getUserById doit retourner un DTO si l\'utilisateur est trouvé', async () => {
        // Préparation
        const fakeUser = { user_id: 'uuid-123', email: 'test@test.com' };
        mockReq.params.id = 'uuid-123';
        userService.getUserById.mockResolvedValue(fakeUser);

        // Action
        await userController.getUserById(mockReq, mockRes, mockNext);

        // Assertion
        expect(userService.getUserById).toHaveBeenCalledWith('uuid-123', mockReq.user);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(new UserDto(fakeUser));
    });

    it('getUserById doit retourner 404 si l\'utilisateur n\'est pas trouvé', async () => {
        // Préparation
        mockReq.params.id = 'uuid-inconnu';
        userService.getUserById.mockResolvedValue(null);

        // Action
        await userController.getUserById(mockReq, mockRes, mockNext);

        // Assertion
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('createUser doit retourner 201 et le nouveau DTO utilisateur', async () => {
        // Préparation
        const fakeUser = { user_id: 'uuid-123', email: 'new@test.com' };
        mockReq.body = { email: 'new@test.com', password: 'pwd' };
        userService.createUser.mockResolvedValue(fakeUser);
        
        // Action
        await userController.createUser(mockReq, mockRes, mockNext);

        // Assertion
        expect(userService.createUser).toHaveBeenCalledWith(mockReq.body, mockReq.user);
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(new UserDto(fakeUser));
    });
    
    it('doit appeler next(error) si le service lève une erreur', async () => {
        // Préparation
        const fakeError = new Error("Erreur de service");
        userService.getAllUsers.mockRejectedValue(fakeError);

        // Action
        await userController.getAllUsers(mockReq, mockRes, mockNext);

        // Assertion
        expect(mockNext).toHaveBeenCalledWith(fakeError);
    });
});