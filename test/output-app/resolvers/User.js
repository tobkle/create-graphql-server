/* eslint-disable prettier */
/* eslint comma-dangle: [2, "only-multiline"] */
const resolvers = {
  UserTweetsConnection: {
    edges(conn, args, { User, me }) {
      return conn.edges;
    },

    pageInfo(conn, args, { User, me }) {
      return conn.pageInfo;
    },
  },
  UserTweetsEdge: {
    node(edge, args, { User, me})  {
      return edge.node;
    },

    cursor(edge, args, { User, me})  {
      return edge.cursor;
    }
  },
  User: {
    id(user) {
      return user._id;
    },

    tweets(user, args, { User, me }) {
      return User.tweets(user, args, me, 'user tweets');
    },

    async tweetsConnection(user, args, { User, me}) {
      const edges = await User.tweets(user, args, me, 'user tweets');
      return User.context.paginate(edges, args);
    },

    liked(user, args, { User, me }) {
      return User.liked(user, args, me, 'user liked');
    },

    async likedConnection(user, args, { User, me}) {
      const edges = await User.liked(user, args, me, 'user liked');
      return User.context.paginate(edges, args);
    },

    following(user, args, { User, me }) {
      return User.following(user, args, me, 'user following');
    },

    async followingConnection(user, args, { User, me}) {
      const edges = await User.following(user, args, me, 'user following');
      return User.context.paginate(edges, args);
    },

    followers(user, args, { User, me }) {
      return User.followers(user, args, me, 'user followers');
    },

    async followersConnection(user, args, { User, me}) {
      const edges = await User.followers(user, args, me, 'user followers');
      return User.context.paginate(edges, args);
    },

    createdBy(user, args, { User, me }) {
      return User.createdBy(user, me, 'user createdBy');
    },

    updatedBy(user, args, { User, me }) {
      return User.updatedBy(user, me, 'user updatedBy');
    }
  },
  Query: {
    users(root, args, { User, me }) {
      return User.find(args, me, 'users');
    },

    user(root, { id }, { User, me }) {
      return User.findOneById(id, me, 'user');
    }
  },
  Mutation: {
    async createUser(root, { input }, { User, me }) {
      return await User.insert(input, me, 'createUser');
    },

    async updateUser(root, { id, input }, { User, me }) {
      return await User.updateById(id, input, me, 'updateUser');
    },

    async removeUser(root, { id }, { User, me }) {
      return await User.removeById(id, me, 'removeUser');
    }
  },
  Subscription: {
    userCreated: user => user,
    userUpdated: user => user,
    userRemoved: id => id
  }
};

export default resolvers;
