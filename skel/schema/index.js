import fs from 'fs';
import { buildRequiredTypes } from 'create-graphql-server-query-arguments';
import path from 'path';
import { templates } from 'create-graphql-server-connections';

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
`];

typeDefs.push(buildRequiredTypes());

typeDefs.push(requireGraphQL(
  path.join(...templates.schema, 'common', 'requiredTypes.graphql')
));

export default typeDefs;
