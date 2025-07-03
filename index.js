import express from 'express';
import userRoutes from './src/routes/userRoutes.js';
import { errorHandler } from './src/middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Route pour le "Health Check" de Render
app.get('/', (req, res) => {
    res.status(200).send('API Geodiag is running. 🎉');
});

// 1. On déclare les routes
app.use('/api', userRoutes);

// 2. On déclare le gestionnaire d'erreurs (il doit être le dernier middleware)
app.use(errorHandler);

// 3. On démarre le serveur (en tout dernier)
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});