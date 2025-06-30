import express from 'express';
import userRoutes from './src/routes/userRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// L'application utilise les routes pour les URL commençant par /api
app.use('/api', userRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});