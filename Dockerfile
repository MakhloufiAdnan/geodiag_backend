# ÉTAPE 1 : BUILD
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

RUN chmod +x ./start.sh

# Active le Healthcheck pour que Fly.io puisse surveiller la santé de l'application
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

# Change l'utilisateur pour ne plus être root
USER appuser

# Expose le port
EXPOSE 3000

# Lance l'application
CMD ["./start.sh"]