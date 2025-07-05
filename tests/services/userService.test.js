import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * @file Tests unitaires pour UserService
 * @description Cette suite, teste la logique métier de UserService en isolant la couche de repository.
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
            userRepository.findByEmail.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashed_password');
            userRepository.create.mockResolvedValue({ id: 1, ...userData });

            await userService.createUser(userData, mockAdminUser);

            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
            expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({ password_hash: 'hashed_password' }));
        });

        it('doit lever une erreur 403 si appelé par un technicien', async () => {
            // Attend à ce que cette opération échoue (rejects)
            await expect(userService.createUser(userData, mockTechnicianUser))
                .rejects.toThrow('Accès refusé. Droits administrateur requis.');
        });

        it('doit lever une erreur 409 si l\'email existe déjà', async () => {
            userRepository.findByEmail.mockResolvedValue({ email: 'test@test.com' });
            
            await expect(userService.createUser(userData, mockAdminUser))
                .rejects.toThrow('Un utilisateur avec cet email existe déjà.');
        });
    });

    // --- Tests pour getUserById ---
    describe('getUserById', () => {
        it('doit autoriser un admin à voir n\'importe quel profil', async () => {
            const targetUserId = 'some-other-user-id';
            await userService.getUserById(targetUserId, mockAdminUser);
            expect(userRepository.findById).toHaveBeenCalledWith(targetUserId);
        });

        it('doit autoriser un technicien à voir son propre profil', async () => {
            await userService.getUserById(mockTechnicianUser.userId, mockTechnicianUser);
            expect(userRepository.findById).toHaveBeenCalledWith(mockTechnicianUser.userId);
        });

        it('doit refuser à un technicien de voir le profil d\'un autre', async () => {
            const anotherUserId = 'another-id';
            await expect(userService.getUserById(anotherUserId, mockTechnicianUser))
                .rejects.toThrow('Accès refusé.');
        });
    });
    
    // --- Tests pour getAllUsers ---
    describe('getAllUsers', () => {
        it('doit retourner les utilisateurs si appelé par un admin', async () => {
            userRepository.findAll.mockResolvedValue([]);
            userRepository.countAll.mockResolvedValue(0);

            await userService.getAllUsers(1, 10, mockAdminUser);
            
            expect(userRepository.findAll).toHaveBeenCalled();
            expect(userRepository.countAll).toHaveBeenCalled();
        });

        it('doit lever une erreur 403 si appelé par un technicien', async () => {
            await expect(userService.getAllUsers(1, 10, mockTechnicianUser))
                .rejects.toThrow('Accès refusé. Droits administrateur requis.');
        });
    });
});
