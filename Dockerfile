# ÉTAPE 1 : BUILD
# Utilisation d'une image complète de Node.js pour installer les dépendances (y compris les devDependencies)
FROM node:22.17.0-alpine3.21 AS builder

WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installe TOUTES les dépendances, y compris celles pour les tests
RUN npm install

# Copie le reste du code source
COPY . .


# ÉTAPE 2 : PRODUCTION 
# Je repart d'une image neuve et légère pour la production
FROM node:22.17.0-alpine3.21

WORKDIR /app

# Création d'un utilisateur et un groupe non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copie uniquement des dépendances de production depuis l'étape "builder"
# Cela évite d'inclure les dépendances de développement (comme jest, supertest) dans l'image finale.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copie le code source
COPY --from=builder /app/src ./src
COPY --from=builder /app/index.js ./index.js

# S'assurer que le nouvel utilisateur est propriétaire des fichiers
RUN chown -R appuser:appgroup /app

# Change l'utilisateur pour ne plus être root
USER appuser

# Expose le port
EXPOSE 3000

# Lance l'application
CMD [ "npm", "start" ]