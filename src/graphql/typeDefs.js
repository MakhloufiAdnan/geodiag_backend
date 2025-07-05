export const typeDefs = `#graphql
    # ... autres types (User, Company, AuthPayload, etc.) ...

    # Le type User, basé sur votre UserDto
    type User {
        userId: ID!
        email: String!
        firstName: String
        lastName: String
        role: String
        isActive: Boolean
        company: Company # Relation vers la compagnie
    }

    type Company {
        companyId: ID!
        name: String!
        address: String
        email: String!
        phoneNumber: String
    }
    
    type AuthPayload {
        token: String!
        user: User!
    }
    
    input CreateUserInput {
        company_id: ID!
        email: String!
        password: String!
        first_name: String!
        last_name: String!
        role: String!
    }

    # --- DÉBUT DES MODIFICATIONS POUR LA PAGINATION ---

    # Un type pour les métadonnées de pagination, correspondant à ce que
    # votre userService renvoie.
    type PaginationMeta {
        totalItems: Int!
        totalPages: Int!
        currentPage: Int!
        pageSize: Int!
    }

    # Un type qui combine les données (le tableau d'utilisateurs) et les métadonnées.
    type PaginatedUsers {
        data: [User]!
        meta: PaginationMeta!
    }

    # --- FIN DES MODIFICATIONS POUR LA PAGINATION ---

    type Query {
        user(id: ID!): User
        company(id: ID!): Company
        me: User
        
        # La requête 'users' renvoie maintenant le type paginé complet.
        users(page: Int, limit: Int): PaginatedUsers
    }

    type Mutation {
        loginCompanyAdmin(email: String!, password: String!): AuthPayload!
        loginTechnician(email: String!, password: String!): AuthPayload!
        createUser(input: CreateUserInput!): User!
    }
`;