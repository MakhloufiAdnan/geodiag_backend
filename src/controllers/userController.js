import userService from '../services/userService.js';

class UserController {
    async getAllUsers(req, res) {
        try {
            const users = await userService.getAllUsers();
            res.status(200).json(users); // Statut 200 OK
        } catch (error) {
            // Gestion basique des erreurs
            console.error(error); 
            res.status(500).json({ message: "Error fetching users" });
        }
    }
}

export default new UserController();