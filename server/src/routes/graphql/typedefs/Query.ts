import gql from 'graphql-tag';

/* GraphQL */
export const typeDefs = gql`
  type Query {
    status: ActionResult
    me: User
    projects: [Project]
    project(id: ID!): Project
  }
`;
