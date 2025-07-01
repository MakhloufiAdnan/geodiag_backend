import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// 1. Simulation de la couche de service
jest.unstable_mockModule('../../src/services/userService.js', () => ({
    default: {
        getAllUsers: jest.fn(),
        getUserById: jest.fn(),
        createUser: jest.fn(),
        updateUser: jest.fn(),
        deleteUser: jest.fn(),
    },
}));

// 2. Importation des modules ---
// Importation du service 
const { default: userService } = await import('../../src/services/userService.js');
// Importation du contrôleur (qui va recevoir le service simulé)
const { default: userController } = await import('../../src/controllers/userController.js');
// Importation du DTO nécessaire pour les assertions
const { UserDto } = await import('../../src/dtos/userDto.js');

// 3. Ecriture des tests
describe('UserController', () => {
    let mockReq, mockRes;

    // Avant chaque test, on crée des objets req et res simulés
    beforeEach(() => {
        mockReq = {
            params: {},
            query: {},
            body: {},
        };
        mockRes = {
            status: jest.fn().mockReturnThis(), // Permet d'enchaîner .status().json()
            json: jest.fn(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    it('getAllUsers doit retourner une liste paginée de DTOs', async () => {
        const fakeUsers = { data: [{ user_id: 1, email: 'test@test.com' }], meta: {} };
        userService.getAllUsers.mockResolvedValue(fakeUsers);

        await userController.getAllUsers(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.any(Array),
            meta: expect.any(Object),
        }));
    });

    it('getUserById doit retourner un DTO si l\'utilisateur est trouvé', async () => {
        const fakeUser = { user_id: 'uuid-123', email: 'test@test.com' };
        mockReq.params.id = 'uuid-123';
        userService.getUserById.mockResolvedValue(fakeUser);

        await userController.getUserById(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(new UserDto(fakeUser));
    });

    it('getUserById doit retourner 404 si l\'utilisateur n\'est pas trouvé', async () => {
        mockReq.params.id = 'uuid-inconnu';
        userService.getUserById.mockResolvedValue(null);

        await userController.getUserById(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('createUser doit retourner 201 et le nouveau DTO utilisateur', async () => {
        const fakeUser = { user_id: 'uuid-123', email: 'new@test.com' };
        mockReq.body = { email: 'new@test.com', password: 'pwd' };
        userService.createUser.mockResolvedValue(fakeUser);
        
        await userController.createUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(new UserDto(fakeUser));
    });

    it('updateUser doit retourner 200 et le DTO mis à jour', async () => {
    const fakeUser = { user_id: 'uuid-123', email: 'test@test.com', first_name: 'John' };
    mockReq.params.id = 'uuid-123';
    mockReq.body = { first_name: 'John' };
    userService.updateUser.mockResolvedValue(fakeUser);

    await userController.updateUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(new UserDto(fakeUser));
    });

    it('updateUser doit retourner 404 si l\'utilisateur n\'est pas trouvé', async () => {
        mockReq.params.id = 'uuid-inconnu';
        mockReq.body = { first_name: 'John' };
        userService.updateUser.mockResolvedValue(null);

        await userController.updateUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it('deleteUser doit retourner 204 si la suppression réussit', async () => {
        mockReq.params.id = 'uuid-123';
        userService.deleteUser.mockResolvedValue({ user_id: 'uuid-123' });

        await userController.deleteUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(204);
        expect(mockRes.send).toHaveBeenCalled();
    });
});