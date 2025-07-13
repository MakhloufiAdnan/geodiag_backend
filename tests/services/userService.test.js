import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ForbiddenException, NotFoundException, ConflictException } from '../../src/exceptions/apiException.js';

/**
 * @file Tests unitaires pour UserService.
 * @description Cette suite teste la logique métier de UserService en isolant la couche de repository.
 * Elle valide la logique de hachage, la gestion des erreurs et les règles d'autorisation.
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
    const anotherUser = { userId: 'another-user-uuid', role: 'technician' };

    // Nettoie tous les mocks avant chaque test pour garantir l'isolation
    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * @describe Tests pour la méthode createUser.
     */
    describe('createUser', () => {
        const userData = { email: 'test@test.com', password: 'password123' };

        it('doit créer un utilisateur, hacher le mot de passe et appeler le repository si appelé par un admin', async () => {
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

        it('doit lever une ForbiddenException si appelé par un technicien', async () => {
            // Arrange
            const action = () => userService.createUser(userData, mockTechnicianUser);
            // Act & Assert
            await expect(action).rejects.toThrow(ForbiddenException);
            await expect(action).rejects.toThrow('Accès refusé. Droits administrateur requis.');
        });

        it("doit lever une ConflictException si l'email existe déjà", async () => {
            // Arrange
            userRepository.findByEmail.mockResolvedValue({ email: 'test@test.com' });
            const action = () => userService.createUser(userData, mockAdminUser);
            // Act & Assert
            await expect(action).rejects.toThrow(ConflictException);
            await expect(action).rejects.toThrow('Un utilisateur avec cet email existe déjà.');
        });
    });

    /**
     * @describe Tests pour la méthode getUserById.
     */
    describe('getUserById', () => {
        it("doit autoriser un admin à voir n'importe quel profil", async () => {
            // Arrange
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

        it("doit lever une NotFoundException si l'utilisateur n'existe pas", async () => {
            // Arrange
            userRepository.findById.mockResolvedValue(undefined);
            const action = () => userService.getUserById('non-existent-id', mockAdminUser);

            // Act & Assert
            await expect(action).rejects.toThrow(NotFoundException);
        });

        it("doit lever une ForbiddenException si un technicien essaie de voir le profil d'un autre", async () => {
            // Arrange
            const action = () => userService.getUserById(anotherUser.userId, mockTechnicianUser);
            // Act & Assert
            await expect(action).rejects.toThrow(ForbiddenException);
            await expect(action).rejects.toThrow('Accès refusé.');
        });
    });
    
    /**
     * @describe Tests pour la méthode getAllUsers.
     */
    describe('getAllUsers', () => {
        it('doit retourner une liste paginée d\'utilisateurs si appelé par un admin', async () => {
            // Arrange
            userRepository.findAll.mockResolvedValue([anotherUser]);
            userRepository.countAll.mockResolvedValue(1);
            
            // Act
            const result = await userService.getAllUsers(1, 10, mockAdminUser);
            
            // Assert
            expect(userRepository.findAll).toHaveBeenCalledWith(10, 0);
            expect(result.data).toHaveLength(1);
            expect(result.meta.totalItems).toBe(1);
        });

        it('doit lever une ForbiddenException si appelé par un technicien', async () => {
            // Arrange
            const action = () => userService.getAllUsers(1, 10, mockTechnicianUser);
            // Act & Assert
            await expect(action).rejects.toThrow(ForbiddenException);
        });
    });

    /**
     * @describe Tests pour la méthode updateUser.
     */
    describe('updateUser', () => {
        const updateData = { first_name: 'Updated Name' };

        it("doit autoriser un admin à mettre à jour n'importe quel utilisateur", async () => {
            // Arrange
            userRepository.update.mockResolvedValue({ ...anotherUser, ...updateData });
            
            // Act
            await userService.updateUser(anotherUser.userId, updateData, mockAdminUser);
            
            // Assert
            expect(userRepository.update).toHaveBeenCalledWith(anotherUser.userId, updateData);
        });

        it('doit autoriser un technicien à mettre à jour son propre profil', async () => {
            // Arrange
            userRepository.update.mockResolvedValue({ ...mockTechnicianUser, ...updateData });
            
            // Act
            await userService.updateUser(mockTechnicianUser.userId, updateData, mockTechnicianUser);
            
            // Assert
            expect(userRepository.update).toHaveBeenCalledWith(mockTechnicianUser.userId, updateData);
        });

        it('doit lever une ForbiddenException si un technicien essaie de mettre à jour un autre utilisateur', async () => {
            // Arrange
            const action = () => userService.updateUser(anotherUser.userId, updateData, mockTechnicianUser);
            
            // Act & Assert
            await expect(action).rejects.toThrow(ForbiddenException);
        });

        it("doit lever une ConflictException si l'email est déjà pris par un autre utilisateur", async () => {
            // Arrange
            const updateDataWithEmail = { email: 'existing@test.com' };
            userRepository.findByEmail.mockResolvedValue({ user_id: 'other-user-id' });
            
            const action = () => userService.updateUser(mockTechnicianUser.userId, updateDataWithEmail, mockTechnicianUser);

            // Act & Assert
            await expect(action).rejects.toThrow(ConflictException);
        });

        it("doit lever une NotFoundException si l'utilisateur à mettre à jour n'existe pas", async () => {
            // Arrange
            userRepository.update.mockResolvedValue(null);
            const action = () => userService.updateUser('non-existent-id', {}, mockAdminUser);
            
            // Act & Assert
            await expect(action).rejects.toThrow(NotFoundException);
        });
    });

    /**
     * @describe Tests pour la méthode deleteUser.
     */
    describe('deleteUser', () => {
        it('doit autoriser un admin à supprimer un utilisateur', async () => {
            // Arrange
            userRepository.delete.mockResolvedValue(anotherUser);
            
            // Act
            await userService.deleteUser(anotherUser.userId, mockAdminUser);
            
            // Assert
            expect(userRepository.delete).toHaveBeenCalledWith(anotherUser.userId);
        });

        it('doit lever une ForbiddenException si un technicien essaie de supprimer un utilisateur', async () => {
            // Arrange
            const action = () => userService.deleteUser(anotherUser.userId, mockTechnicianUser);
            
            // Act & Assert
            await expect(action).rejects.toThrow(ForbiddenException);
        });

        it("doit lever une NotFoundException si l'utilisateur à supprimer n'existe pas", async () => {
            // Arrange
            userRepository.delete.mockResolvedValue(null);
            const action = () => userService.deleteUser('non-existent-id', mockAdminUser);
            
            // Act & Assert
            await expect(action).rejects.toThrow(NotFoundException);
        });
    });
});
