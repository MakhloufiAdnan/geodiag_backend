import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// 1. Déclaration des Mocks
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

// 2. Imports
const { default: userRepository } = await import('../../src/repositories/userRepository.js');
const { default: bcrypt } = await import('bcrypt');
const { default: userService } = await import('../../src/services/userService.js');


describe('UserService', () => {
    // Nettoie les mocks avant chaque test
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Test pour CREATE
    it('createUser doit hacher le mot de passe et appeler le repository', async () => {
        const userData = { email: 'test@test.com', password: 'password123' };
        userRepository.findByEmail.mockResolvedValue(null);
        bcrypt.hash.mockResolvedValue('hashed_password');
        userRepository.create.mockResolvedValue({ id: 1, ...userData });
        await userService.createUser(userData);
        expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
        expect(userRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ password_hash: 'hashed_password' })
        );
    });

    // Test pour READ (by ID)
    it('getUserById doit appeler le repository avec le bon ID', async () => {
        const userId = 'uuid-123';
        userRepository.findById.mockResolvedValue({ user_id: userId, email: 'user@test.com' });
        await userService.getUserById(userId);
        expect(userRepository.findById).toHaveBeenCalledWith(userId);
    });

    // Test pour UPDATE
    it('updateUser doit appeler le repository avec les bonnes données', async () => {
        const userId = 'uuid-123';
        const userData = { first_name: 'John' };
        userRepository.update.mockResolvedValue({ user_id: userId, ...userData });
        await userService.updateUser(userId, userData);
        expect(userRepository.update).toHaveBeenCalledWith(userId, userData);
    });

    // Test pour DELETE
    it('deleteUser doit appeler le repository avec le bon ID', async () => {
        const userId = 'uuid-123';
        userRepository.delete.mockResolvedValue({ user_id: userId });
        await userService.deleteUser(userId);
        expect(userRepository.delete).toHaveBeenCalledWith(userId);
    });
});