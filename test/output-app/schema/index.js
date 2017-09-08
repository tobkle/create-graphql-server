import fs from 'fs';
import { buildRequiredTypes } from 'create-graphql-server-query-arguments';

function requireGraphQL(name) {
  const filename = require.resolve(name);
  return fs.readFileSync(filename, 'utf8');
}

const typeDefs = [`
  scalar ObjID

  type Query {
    # A placeholder, please ignore
    __placeholder: Int
  }
  type Mutation {
    # A placeholder, please ignore
    __placeholder: Int
  }
  type Subscription {
    # A placeholder, please ignore
    __placeholder: Int
  }

  interface Node {
    # the ObjID of a node
    id: ObjID!
  }

  interface Edge {
    # cursor containing an ObjID
    cursor: String!

    # node containing data of a type
    node: Node
  }

  interface Connection {
    # edges
    edges: [Edge]

    # information for previous or next pages
    pageInfo: PageInfo
  }

  type PageInfo {
    # no previous page available
    hasPreviousPage: Boolean!

    # no next page available
    hasNextPage: Boolean!
  }
  
  extend type Query {
    # An entity in the schema
    node(id: ObjID!): Node
  }

`];

typeDefs.push(buildRequiredTypes());

export default typeDefs;

typeDefs.push(requireGraphQL('./Tweet.graphql'));

typeDefs.push(requireGraphQL('./User.graphql'));
