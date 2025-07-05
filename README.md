Geodiag Backend API
Backend API pour l'application de contrôle de géométrie des trains roulants Geodiag. Ce service gère les comptes clients, les licences, les techniciens, les véhicules et les données de mesure, et expose à la fois une API REST et une API GraphQL.

✨ Fonctionnalités
Double API : API RESTful et API GraphQL pour une flexibilité maximale.

Gestion des Comptes : Inscription et gestion multi-niveaux (Compagnies et Techniciens).

Système de Licences : Gestion complète des offres, commandes, paiements et licences.

Authentification Sécurisée : Basée sur JWT (JSON Web Tokens).

Base de Données Robuste : Schéma PostgreSQL complet avec migrations gérées par node-pg-migrate.

CI/CD Automatisé : Intégration et déploiement continus avec GitHub Actions.

Environnement Conteneurisé : Utilisation de Docker et Docker Compose pour un développement local fiable.

🛠️ Stack Technique
Langage : Node.js (ESM)

Framework : Express.js

API GraphQL : Apollo Server v4

Base de Données : PostgreSQL

Authentification : JWT, bcrypt

Validation : Joi

Tests : Jest, Supertest

CI/CD : GitHub Actions

Environnement : Docker

🚀 Démarrage Rapide (Local)
Suivez ces étapes pour lancer le projet sur votre machine locale.

Prérequis
Node.js (v22 ou supérieure)

Docker et Docker Compose

1. Cloner le Dépôt
git clone [https://github.com/MakhloufiAdnan/geodiag_backend.git](https://github.com/MakhloufiAdnan/geodiag_backend.git)
cd geodiag_backend

2. Configurer l'Environnement
Créez un fichier .env à la racine du projet en copiant le modèle .env.example.

# Vous pouvez copier le contenu ci-dessous dans un nouveau fichier .env
# .env

# Base de données locale (utilisée par docker-compose)
DB_HOST=localhost
DB_PORT=5432
DB_USER=geodiag
DB_PASSWORD=your_strong_password_here # Changez ceci
DB_DATABASE=geodiag_test_db

# Secrets pour JWT
JWT_SECRET=your_super_secret_jwt_key # Changez ceci

3. Lancer les Services
Lancez la base de données PostgreSQL dans un conteneur Docker.

docker-compose up -d

4. Installer les Dépendances
npm install

5. Appliquer les Migrations
Créez les tables dans votre base de données locale.

npm run migrate up

6. Lancer le Serveur
npm start

Votre API est maintenant accessible à l'adresse http://localhost:3000 (ou le port que vous avez défini).

📜 Scripts Disponibles
npm start : Démarre le serveur en mode production.

npm test : Lance la suite de tests avec Jest.

npm run test:coverage : Lance les tests et génère un rapport de couverture.

npm run lint : Analyse le code avec ESLint pour détecter les problèmes de style.

npm run migrate up : Applique toutes les migrations de base de données en attente.

npm run migrate down : Annule la dernière migration appliquée.

⚙️ Intégration et Déploiement Continus (CI/CD)
Le projet est configuré avec GitHub Actions pour automatiser les tests et le déploiement.

Tests : Un push ou une pull request sur la branche main déclenche automatiquement le job de test (linting, audit de sécurité, tests d'intégration).

Déploiement : La création et le push d'un tag Git commençant par v (ex: v1.2.0) déclenchent le déploiement en production sur Render.