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

# Installer le client openssh AVANT de changer d'utilisateur
RUN apk add --no-cache openssh-client

# Copie uniquement des dépendances de production depuis l'étape "builder"
COPY --chown=appuser:appgroup --from=builder /app/node_modules ./node_modules
COPY --chown=appuser:appgroup --from=builder /app/package*.json ./
COPY --chown=appuser:appgroup --from=builder /app/src ./src
COPY --chown=appuser:appgroup --from=builder /app/index.js ./index.js
COPY --chown=appuser:appgroup start.sh .

# Rendre le script exécutable
RUN chmod +x ./start.sh

# Copie le code source
COPY --from=builder /app/src ./src
COPY --from=builder /app/index.js ./index.js

# S'assurer que le nouvel utilisateur est propriétaire des fichiers
RUN chown -R appuser:appgroup /app

# --- AMÉLIORATION : Aà ajouter ---
# Cette instruction indique à Docker comment vérifier si l'application est en bonne santé.
# Elle tente de se connecter à http://localhost:3000/healthz toutes les 30 secondes.
# Si la connexion échoue 3 fois de suite, le conteneur est marqué comme "unhealthy".
# Il faut créer une route GET /healthz dans l'application qui renvoie un statut 200 OK.
# Décommenter les lignes ##
##HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
##  CMD curl -f http://localhost:3000/healthz || exit 1

# Change l'utilisateur pour ne plus être root
USER appuser

# Expose le port
EXPOSE 3000

# Lance l'application
CMD [ "npm", "start" ]