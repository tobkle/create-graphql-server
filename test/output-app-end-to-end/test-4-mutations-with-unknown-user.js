import { describe, it } from 'mocha';
import { assert } from 'chai';
import { sendQuery, sendQueryAndExpect, unknownUser, adminUser } from './sendQuery';

let newUser;
let tweetId;
const tweetIdOthers = '583676d3618530145474e352';

function makeUserInput(user) {
  let query = `{`;
  Object.keys(user).forEach(field => {
    query = query + `
    ${field}: "${user[field]}"`;
  });
  query = query + `
  }`;
  return query;
}

function makeTweetInput(tweet, userId) {
  if (tweet.author) {
    return `{
      authorId: "${userId ? userId : tweet.author.id}",
      coauthorsIds: ${tweet.coauthorsIds ? JSON.stringify(tweet.coauthorsIds) : JSON.stringify([])},
      body: "${tweet.body}"
    }`;
  }
  return `{
    body: "${tweet.body}"
  }`;
}

describe('test-4: unkown user (e.g. not signed in, or expired token)', () => {
  
  describe('on type "user" (part 1)...', () => {

    it('can not create users', () => {
      const expectedUser = {
        email: 'tobias@gmail.com',
        password: 'password',
        username: 'tobkle',
        bio: 'someone',
        role: 'admin'
      };
      return sendQuery({query: `
        mutation {
          createUser(input: ${makeUserInput(expectedUser)}) {
            id
          }
        }
      `, 
      userId: unknownUser
      })
      .then((result) => {
        assert.isNotNull(result.data);
        assert.isNull(result.data.createUser);
      })
    });

    it('can not read other users', () => {
      return sendQueryAndExpect(`
        { user(id: "${adminUser}") { username, bio, role } }
      `, { 
          user: null
       },
      unknownUser)
    });

    it('can not update other users', () => {
        const modifiedUser = {
          username: 'zoltan',
          bio: 'Maker of things, I guess',
          role: 'admin'
        };
        return sendQueryAndExpect(`
          mutation {
            updateUser(id: "${adminUser}", input: ${makeUserInput(modifiedUser)}) {
              username
              bio
              role
            }
          }
        `, { updateUser: null },
        unknownUser)
    });

    it('can not delete other users', () => {
        return sendQueryAndExpect(`
          mutation {
            removeUser(id: "${adminUser}")
          }
        `, { 
            removeUser: null
         },
        unknownUser)
    });

  });

  describe('on type "tweet"...', () => {

    let expectedTweet = {
      author: { id: newUser },
      body: 'This is a test tweet of user tobkle',
    };

    const expectedTweetOtherAuthor = {
      author: { id: adminUser },
      body: 'We put our hearts into this talk about a #GraphQL-first workflow and how it helped us build apps fast:',
    };

    const expectedTweetOtherAuthorNoAuthor = {
      author: null,
      body: 'We put our hearts into this talk about a #GraphQL-first workflow and how it helped us build apps fast:',
    };

    const modifiedTweet = {
      body: 'This is a modified test tweet',
    };

    before(function (done) {
      expectedTweet.author.id = unknownUser;
      sendQuery({ query: `
        mutation {
          createTweet(input: ${makeTweetInput(expectedTweet, unknownUser)}) {
            id
          }
        }
      `, 
      userId: unknownUser
      })
      .then((result) => {
        assert.isNotNull(result.data);
        assert.isNull(result.data.createTweet);
        done();
      })
      .catch((error) => {
        done();
      });
    });

    it('can not create tweet for himself', () => {
      assert.isUndefined(tweetId);
    });

    it('can not create tweet for other author', () => {
      return sendQueryAndExpect(`
        mutation {
          createTweet(input: ${makeTweetInput(expectedTweetOtherAuthor, adminUser)}) {
            id
          }
        }
        `, 
        { createTweet: null },
        unknownUser);
    });

    it('can read others tweet', () => {
      return sendQueryAndExpect(
          `{ tweet(id: "${tweetIdOthers}") { author { id } body } }`,
          { tweet: expectedTweetOtherAuthorNoAuthor },
          unknownUser)
    });

    it('can not update own tweet', () => {
      return sendQueryAndExpect(`
          mutation {
            updateTweet(id: "${tweetIdOthers}", input: ${makeTweetInput(modifiedTweet, unknownUser)}) {
              body
            }
          }
        `, 
        { updateTweet: null },
        unknownUser)
    });

    it('can not update others tweet', () => {
      return sendQueryAndExpect(`
          mutation {
            updateTweet(id: "${tweetIdOthers}", input: ${makeTweetInput(modifiedTweet)}) {
              body
            }
          }
        `, 
        { updateTweet: null },
        unknownUser)
    });

    it('can not remove other users tweet', () => {
      return sendQueryAndExpect(
          `mutation { removeTweet(id: "${tweetIdOthers}") }`,
          { removeTweet: null },
          unknownUser)
    });

  });

});