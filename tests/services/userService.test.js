import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * @file Tests unitaires pour UserService
 * @description Cette suite teste la logique métier de UserService en isolant la couche de repository.
 * Elle valide la logique de hachage, la gestion des erreurs et la logique d'autorisation.
 */

// 1. Déclaration des Mocks pour les dépendances externes
jest.unstable_mockModule('../../src/repositories/userRepository.js', () => ({
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
jest.unstable_mockModule('bcrypt', () => ({
    default: {
        hash: jest.fn(),
    },
}));

// 2. Imports après les mocks
const { default: userRepository } = await import('../../src/repositories/userRepository.js');
const { default: bcrypt } = await import('bcrypt');
const { default: userService } = await import('../../src/services/userService.js');

describe('UserService', () => {

    // 3. Définition d'utilisateurs simulés pour les tests d'autorisation
    const mockAdminUser = { userId: 'admin-uuid-123', role: 'admin' };
    const mockTechnicianUser = { userId: 'tech-uuid-456', role: 'technician' };

    // Nettoie tous les mocks avant chaque test pour garantir l'isolation
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // --- Tests pour createUser ---
    describe('createUser', () => {
        const userData = { email: 'test@test.com', password: 'password123' };

        it('doit créer un utilisateur si appelé par un admin', async () => {
            // Arrange
            userRepository.findByEmail.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashed_password');
            userRepository.create.mockResolvedValue({ id: 1, ...userData });

            // Act
            await userService.createUser(userData, mockAdminUser);

            // Assert
            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
            expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({ password_hash: 'hashed_password' }));
        });

        it('doit lever une erreur 403 si appelé par un technicien', async () => {
            // Arrange
            const action = () => userService.createUser(userData, mockTechnicianUser);
            // Act & Assert
            await expect(action).rejects.toThrow('Accès refusé. Droits administrateur requis.');
        });

        it('doit lever une erreur 409 si l\'email existe déjà', async () => {
            // Arrange
            userRepository.findByEmail.mockResolvedValue({ email: 'test@test.com' });
            const action = () => userService.createUser(userData, mockAdminUser);
            // Act & Assert
            await expect(action).rejects.toThrow('Un utilisateur avec cet email existe déjà.');
        });
    });

    // --- Tests pour getUserById ---
    describe('getUserById', () => {
        it("doit autoriser un admin à voir n'importe quel profil", async () => {
            // Arrange
            const anotherUser = { userId: 'another-user-uuid', role: 'technician' };
            userRepository.findById.mockResolvedValue(anotherUser);

            // Act
            const result = await userService.getUserById(anotherUser.userId, mockAdminUser);

            // Assert
            expect(userRepository.findById).toHaveBeenCalledWith(anotherUser.userId);
            expect(result).toEqual(anotherUser);
        });

        it('doit autoriser un technicien à voir son propre profil', async () => {
            // Arrange
            userRepository.findById.mockResolvedValue(mockTechnicianUser);

            // Act
            const result = await userService.getUserById(mockTechnicianUser.userId, mockTechnicianUser);

            // Assert
            expect(userRepository.findById).toHaveBeenCalledWith(mockTechnicianUser.userId);
            expect(result).toEqual(mockTechnicianUser);
        });

        it('doit refuser à un technicien de voir le profil d\'un autre', async () => {
            // Arrange
            const action = () => userService.getUserById('another-id', mockTechnicianUser);
            // Act & Assert
            await expect(action).rejects.toThrow('Accès refusé.');
        });
    });
    
    // --- Tests pour getAllUsers ---
    describe('getAllUsers', () => {
        it('doit retourner les utilisateurs si appelé par un admin', async () => {
            // Arrange
            userRepository.findAll.mockResolvedValue([]);
            userRepository.countAll.mockResolvedValue(0);
            // Act
            await userService.getAllUsers(1, 10, mockAdminUser);
            // Assert
            expect(userRepository.findAll).toHaveBeenCalled();
        });

        it('doit lever une erreur 403 si appelé par un technicien', async () => {
            // Arrange
            const action = () => userService.getAllUsers(1, 10, mockTechnicianUser);
            // Act & Assert
            await expect(action).rejects.toThrow('Accès refusé. Droits administrateur requis.');
        });
    });

    // --- Tests pour updateUser ---
    describe('updateUser', () => {
        const targetUserId = 'user-to-update-id';
        const updateData = { first_name: 'Updated Name' };

        it('doit autoriser un admin à mettre à jour n\'importe quel utilisateur', async () => {
            // Arrange
            userRepository.update.mockResolvedValue({ user_id: targetUserId, ...updateData });
            // Act
            await userService.updateUser(targetUserId, updateData, mockAdminUser);
            // Assert
            expect(userRepository.update).toHaveBeenCalledWith(targetUserId, updateData);
        });

        it('doit autoriser un technicien à mettre à jour son propre profil', async () => {
            // Arrange
            userRepository.update.mockResolvedValue({ user_id: mockTechnicianUser.userId, ...updateData });
            // Act
            await userService.updateUser(mockTechnicianUser.userId, updateData, mockTechnicianUser);
            // Assert
            expect(userRepository.update).toHaveBeenCalledWith(mockTechnicianUser.userId, updateData);
        });

        it('doit refuser à un technicien de mettre à jour un autre utilisateur', async () => {
            // Arrange
            const action = () => userService.updateUser(targetUserId, updateData, mockTechnicianUser);
            // Act & Assert
            await expect(action).rejects.toThrow('Accès refusé.');
        });
    });

    // --- Tests pour deleteUser ---
    describe('deleteUser', () => {
        const targetUserId = 'user-to-delete-id';

        it('doit autoriser un admin à supprimer un utilisateur', async () => {
            // Arrange
            userRepository.delete.mockResolvedValue({ user_id: targetUserId });
            // Act
            await userService.deleteUser(targetUserId, mockAdminUser);
            // Assert
            expect(userRepository.delete).toHaveBeenCalledWith(targetUserId);
        });

        it('doit refuser à un technicien de supprimer un utilisateur', async () => {
            // Arrange
            const action = () => userService.deleteUser(targetUserId, mockTechnicianUser);
            // Act & Assert
            await expect(action).rejects.toThrow('Accès refusé. Droits administrateur requis.');
        });
    });
});