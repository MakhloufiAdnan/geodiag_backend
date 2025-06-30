import userRepository from '../repositories/userRepository.js';

class UserService {
    async getAllUsers() {
        // Pour l'instant, j'appelle juste le repository.
        return userRepository.findAll();
    }
}

export default new UserService();