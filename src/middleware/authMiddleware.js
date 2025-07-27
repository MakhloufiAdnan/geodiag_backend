import jwt from "jsonwebtoken";
import { pool } from "../db/index.js";

/**
 * Middleware pour protéger les routes.
 * 1. Vérifie la présence et la validité d'un accessToken JWT.
 * 2. Effectue une vérification de "fraîcheur" en base de données.
 * 3. Attache l'utilisateur à jour à `req.user`.
 */
export async function protect(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  if (!token) {
    return res
      .status(401)
      .json({ message: "Accès non autorisé, token manquant." });
  }

  try {
    // Étape 1: Vérifier la signature et l'expiration du token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Étape 2: Vérification de "fraîcheur" en base de données
    const { rows } = await pool.query(
      "SELECT user_id, company_id, email, role, is_active FROM users WHERE user_id = $1",
      [decoded.userId]
    );
    const currentUser = rows[0];

    // Vérifier si l'utilisateur existe toujours et est actif
    if (!currentUser?.is_active) {
      return res
        .status(401)
        .json({
          message: "Accès non autorisé, l'utilisateur n'est plus actif.",
        });
    }

    // Vérifier si le token correspond à l'utilisateur
    // Étape 3: Attacher l'utilisateur à jour (depuis la BDD) à la requête
    req.user = {
      userId: currentUser.user_id,
      companyId: currentUser.company_id,
      role: currentUser.role,
    };

    next();
  } catch (error) {
    // Utiliser le logger contextuel pour une meilleure traçabilité
    const log = req.log || console;
    log.error({ err: error }, "Erreur de vérification JWT");

    res.status(401).json({ message: "Token non valide ou expiré." });
  }
}
