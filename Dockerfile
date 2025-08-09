# --- ÉTAPE 1 : BUILD --- 
FROM node:22-alpine AS builder

WORKDIR /app

# Copie des fichiers de dépendances pour tirer parti du cache Docker.
COPY package*.json ./

# Installe uniquement les dépendances de production de manière fiable et rapide.
RUN npm ci --omit=dev

# Copie le reste du code source de l'application.
COPY . .

# --- ÉTAPE 2 : PRODUCTION --- 

# Repart d'une image de base neuve et identique pour une image finale légère.
FROM node:22-alpine
WORKDIR /app

RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app && \
    apk add --no-cache curl postgresql-client

# Copie les artefacts nécessaires depuis l'étape 'builder' en assignant
# directement le bon propriétaire pour plus de sécurité.
COPY --chown=appuser:appgroup --from=builder /app/node_modules ./node_modules
COPY --chown=appuser:appgroup --from=builder /app/package*.json ./
COPY --chown=appuser:appgroup --from=builder /app/src ./src
COPY --chown=appuser:appgroup --from=builder /app/index.js ./index.js
COPY --chown=appuser:appgroup start.sh .

# Rend le script de démarrage exécutable.
RUN chmod +x ./start.sh

# Active le Healthcheck pour que l'orchestrateur puisse surveiller la santé de l'application.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

# Change l'utilisateur pour ne plus être root, une mesure de sécurité essentielle.
USER appuser

# Expose le port sur lequel l'application écoute.
EXPOSE 3000

# Définit la commande pour lancer l'application au démarrage du conteneur.
CMD ["./start.sh"]
