/**
 * Crée un objet de réponse paginée standard.
 * Cette fonction calcule les métadonnées de pagination (nombre total de pages, etc.)
 * et génère des liens de navigation (suivant, précédent, premier, dernier).
 *
 * @param {object} options - Les options pour créer la réponse.
 * @param {Array<any>} options.data - Le tableau de données pour la page actuelle.
 * @param {number} options.totalItems - Le nombre total d'éléments dans la collection complète.
 * @param {number} options.page - Le numéro de la page actuelle.
 * @param {number} options.limit - Le nombre d'éléments par page.
 * @param {string} options.baseUrl - L'URL de base pour construire les liens de navigation (ex: '/api/users').
 * @returns {object} Un objet de réponse paginée structuré.
 */
export const createPaginatedResponse = ({
  data,
  totalItems,
  page,
  limit,
  baseUrl,
}) => {
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  // Construit l'URL avec les paramètres de pagination
  const buildUrl = (pageNumber) => {
    const url = new URL(baseUrl, "http://localhost"); // Le domaine est factice, juste pour la construction
    url.searchParams.set("page", pageNumber);
    url.searchParams.set("limit", limit);
    return `${url.pathname}${url.search}`; // Retourne le chemin avec les query params (ex: /api/users?page=2&limit=10)
  };

  return {
    // Métadonnées sur la pagination
    metadata: {
      totalItems,
      itemsPerPage: data.length,
      totalPages,
      currentPage: page,
      hasNextPage,
      hasPreviousPage,
    },

    // Liens de navigation pour une expérience HATEOAS
    links: {
      self: buildUrl(page),
      first: buildUrl(1),
      last: buildUrl(totalPages),
      next: hasNextPage ? buildUrl(page + 1) : null,
      previous: hasPreviousPage ? buildUrl(page - 1) : null,
    },

    // Les données de la page actuelle
    data,
  };
};
