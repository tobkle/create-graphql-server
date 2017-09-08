import { ObjectId } from 'mongodb';
import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';
import { merge } from 'lodash';

const resolvers = {};

resolvers.ObjID = new GraphQLScalarType({
  name: 'ObjID',
  description: 'Id representation, based on Mongo Object Ids',
  parseValue(value) {
    return ObjectId(value);
  },
  serialize(value) {
    return value.toString();
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return ObjectId(ast.value);
    }
    return null;
  },
});

// PAGEINFO =====================
resolvers.PageInfo = {
  
  hasPreviousPage(pageInfo, args, { PageInfo, me }) {
    return pageInfo.hasPreviousPage;
  },

  hasNextPage(pageInfo, args, { PageInfo, me }) {
    return pageInfo.hasNextPage;
  }
}
// PAGEINFO ======================

export default resolvers;

import tweetResolvers from './Tweet';
merge(resolvers, tweetResolvers);

import userResolvers from './User';
merge(resolvers, userResolvers);
