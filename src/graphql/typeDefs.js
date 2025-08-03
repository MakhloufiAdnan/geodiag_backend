/**
 * @file Définit le schéma GraphQL complet pour l'API Geodiag.
 * @description Ce schéma est la source unique de vérité pour la structure de l'API.
 * Il intègre des patterns avancés pour la robustesse et la maintenabilité.
 */
export const typeDefs = `#graphql

    # --- ENUMS & INPUTS ---

    # Rôles utilisateurs pour une sécurité de type stricte.
    enum UserRole {
        admin
        technician
        superAdmin
        supportAgent
    }

    # Statuts de licence possibles.
    enum LicenseStatus {
        active
        expired
        revoked
    }

    # Statuts de commande possibles.
    enum OrderStatus {
        pending
        processing
        completed
        cancelled
    }

    # Regroupe les arguments pour la création d'une offre.
    input CreateOfferInput {
        name: String!
        description: String
        price: Float!
        durationMonths: Int!
        maxUsers: Int
        isPublic: Boolean!
    }

    # Regroupe les arguments pour la mise à jour d'une offre.
    input UpdateOfferInput {
        name: String
        description: String
        price: Float
        durationMonths: Int
        maxUsers: Int
        isPublic: Boolean
    }

    # --- TYPES DE BASE (Entités Métier) ---

    type User {
        userId: ID!
        email: String!
        firstName: String
        lastName: String
        role: UserRole!
        company: Company
    }

    type Company {
        companyId: ID!
        name: String!
        email: String!
    }

    type Offer {
        offerId: ID!
        name: String!
        description: String
        price: Float!
        durationMonths: Int!
        maxUsers: Int
        isPublic: Boolean!
    }

    type Order {
        orderId: ID!
        orderNumber: String!
        amount: Float!
        status: OrderStatus!
        createdAt: String!
        offer: Offer
        company: Company
    }
    
    type License {
        licenseId: ID!
        status: LicenseStatus!
        expiresAt: String!
        qrCodePayload: String!
        order: Order
    }

    # --- TYPES SPÉCIFIQUES (Payloads & Pagination) ---

    # Contrat de retour stable pour les opérations d'authentification.
    type AuthPayload {
        accessToken: String!
        user: User!
    }
    
    # Contrat de retour pour l'initiation d'un paiement Stripe.
    type CheckoutSessionPayload {
        sessionId: String!
        url: String!
    }

    # Contrat de retour stable pour la création de commande.
    type CreateOrderPayload {
        success: Boolean!
        message: String
        order: Order
    }

    # Contrat de retour stable pour la création d'offre.
    type CreateOfferPayload {
        success: Boolean!
        message: String
        offer: Offer
    }

    # Contrat de retour stable pour la mise à jour d'offre.
    type UpdateOfferPayload {
        success: Boolean!
        message: String
        offer: Offer
    }

    # Métadonnées pour les résultats paginés.
    type PaginationMeta {
        totalItems: Int!
        totalPages: Int!
        currentPage: Int!
        pageSize: Int!
    }

    # Structure complète pour les résultats paginés d'utilisateurs.
    type PaginatedUsers {
        data: [User!]!
        meta: PaginationMeta!
    }

    # --- QUERIES (Points d'entrée en lecture) ---
  
    type Query {
        "Récupère les offres commerciales publiques."
        publicOffers: [Offer!]

        "Récupère TOUTES les offres, y compris non publiques (super-admin uniquement)."
        allOffers: [Offer!]

        "Récupère une commande par son ID (admin de la compagnie propriétaire)."
        order(id: ID!): Order
        
        "Récupère la licence active de la compagnie de l'admin connecté."
        myActiveLicense: License
        
        "Récupère les informations de l'utilisateur actuellement connecté."
        me: User

        "Récupère la liste paginée des utilisateurs de la compagnie."
        users(page: Int, limit: Int): PaginatedUsers
    }

    # --- MUTATIONS (Points d'entrée en écriture) ---
    
    type Mutation {
        "Connecte un administrateur de compagnie."
        loginCompanyAdmin(email: String!, password: String!): AuthPayload!

        "Connecte un technicien."
        loginTechnician(email: String!, password: String!): AuthPayload!

        "Crée une commande à partir d'une offre (admin de compagnie)."
        createOrder(offerId: ID!): CreateOrderPayload!

        "Crée une session de paiement Stripe pour une commande (admin de compagnie)."
        createCheckoutSession(orderId: ID!): CheckoutSessionPayload!

        "Crée une nouvelle offre commerciale (super-admin)."
        createOffer(input: CreateOfferInput!): CreateOfferPayload!

        "Met à jour une offre existante (super-admin)."
        updateOffer(offerId: ID!, input: UpdateOfferInput!): UpdateOfferPayload!

        "Supprime une offre (super-admin)."
        deleteOffer(offerId: ID!): Boolean!
    }
`;
