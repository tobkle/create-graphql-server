/* eslint-disable prettier */
/* eslint comma-dangle: [2, "only-multiline"] */
const resolvers = {

  UserFriendsEdge: {
    node(edge, args, { User, me})  {
      return edge.node;
    },

    cursor(edge, args, { User, me})  {
      return edge.cursor;
    }
  },

  UserFriendsConnection: {
    edges(conn, args, { User, me }) {
      return conn.edges;
    },

    pageInfo(conn, args, { User, me }) {
      return conn.pageInfo;
    },
  },

  UserTweetEdge: {
    node(edge, args, { User, me})  {
      return edge.node;
    },

    cursor(edge, args, { User, me})  {
      return edge.cursor;
    }
  },

  UserTweetsConnection: {
    edges(conn, args, { User, me }) {
      return conn.edges;
    },

    pageInfo(conn, args, { User, me }) {
      return conn.pageInfo;
    },
  },

  User: {
    id(user) {
      return user._id;
    },

    tweets(user, args, { User, me }) {
      return User.tweets(user, args, me, 'user tweets');
    },

    liked(user, args, { User, me }) {
      return User.liked(user, args, me, 'user liked');
    },

    following(user, args, { User, me }) {
      return User.following(user, args, me, 'user following');
    },

    followers(user, args, { User, me }) {
      return User.followers(user, args, me, 'user followers');
    },

    createdBy(user, args, { User, me }) {
      return User.createdBy(user, me, 'user createdBy');
    },

    updatedBy(user, args, { User, me }) {
      return User.updatedBy(user, me, 'user updatedBy');
    },

    async tweetsConnection(user, args, { User, me}) {
      const pagination = User.context.cursorBasedPagination;
      pagination.checkArguments(args);
      const edges = await User.tweets(user, args, me, 'user tweetsConnection');
      return pagination.get(edges, args);
    },

    async friendsConnection(user, args, { User, me}) {
      const pagination = User.context.cursorBasedPagination;
      pagination.checkArguments(args);
      const edges = await User.find(args, me, 'user friendsConnection')
      return pagination.get(edges, args);
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
