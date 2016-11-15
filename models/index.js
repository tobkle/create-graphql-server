import Users from './Users';

// etc
import Tweets from './Tweets';

export function updateContext(context) {
  const { db, pubSub } = context;
  context.Users = new Users({ db, pubSub });
  context.Tweets = new Tweets({ db, pubSub });
}
