import { describe, it } from 'mocha';
import { assert } from 'chai';
import { sendQuery, sendQueryAndExpect, unknownUser, defaultUser, roleUser, adminUser } from './sendQuery';


describe('test-2: connection queries as user with role "admin"', () => {

  function itQueries(name, query, expectedResult) {
    it(name, () => {
      sendQueryAndExpect(query, expectedResult, adminUser);
    });
  }

  function itPaginates({ rootField, rootFieldArg, field, subfield }, expectedItems) {
    it(`paginates ${field}`, () => {
      function constructQuery(args = '') {

        const subQuery = `
          ${field}${args} {
            edges {
                    node {
                      ${subfield}
                      createdAt 
                    }
                  }
          }
        `;

        if (!rootField) {
          return `{ 
            ${field}${args} {
              ${subfield}
              createdAt
            }
          }`;
        }
        return `{
          ${rootField}${rootFieldArg} {
            ${subQuery}
          }
        }`;
      }
      function checkResult(result, offset, length) {
        // console.log(JSON.stringify(result, null, 2));
        assert.isDefined(result.data);
        debugger;
        const items = rootField ? 
          result.data[rootField][field].edges : 
          result.data[field];
        assert.equal(items.length, length);
        for (let i = 0; i < length; i += 1) {
          if (items[i].node){
            assert.equal(items[i].node[subfield], expectedItems[i + offset][subfield]);
          } else {
            assert.equal(items[i][subfield], expectedItems[i + offset][subfield]);
          }
        }
        return items;
      }

      let cursor;
      return sendQuery(               /* 1 */
            { query: constructQuery(), userId: adminUser
          })
        .then((result) => {
          const items = checkResult(result, 0, expectedItems.length);
          if (items[0].node){
            cursor = items[0].node.createdAt;  // => take first createdAt
          } else {
            cursor = items[0].createdAt;  // => take first createdAt
          }
        })

        .then(() => sendQuery(         /* 2  */
            { query: constructQuery(`(${rootField ? 'first' : 'limit'}: 1)`), userId: adminUser 
          }))
        .then(result =>
          checkResult(result, 0, 1))

        .then(() => sendQuery({         /* 3 */
          query: constructQuery(`(${rootField ? 'after' : 'lastCreatedAt'}: ${cursor})`),
          userId: adminUser,
        }))
        .then(result => 
          checkResult(result, 1, expectedItems.length - 1))

        .then(() => sendQuery({          /* 4 */
          query: constructQuery(`(${rootField ? 'after' : 'lastCreatedAt'}: ${cursor}, ${rootField ? 'first' : 'limit'}: 1)`),
          userId: adminUser,
        }))
        .then(result =>
          checkResult(result, 1, Math.min(expectedItems.length - 1, 1))
        );
    });
  }

  describe('users', () => {
    itQueries('basic data',
      '{ user(id: "583291a1638566b3c5a92ca0") { id, username, bio } }',
      { user: {
        id: '583291a1638566b3c5a92ca0',
        username: 'tmeasday',
        bio: 'I build things with @percolatestudio. Author of @discovermeteor. Exploring how to improve user experience through technology, design and performance.',
      } }
    );

    itPaginates({
      field: 'users',
      subfield: 'username',
    }, [{ username: 'tmeasday' }, { username: 'stubailo' }, { username: 'lacker' }]);

    itPaginates({
      rootField: 'user',
      rootFieldArg: '(id: "583291a1638566b3c5a92ca0")',
      field: 'followersConnection',
      subfield: 'username',
    }, [{ username: 'stubailo' }]);

    itPaginates({
      rootField: 'user',
      rootFieldArg: '(id: "583291a1638566b3c5a92ca0")',
      field: 'followingConnection',
      subfield: 'username',
    }, [{ username: 'stubailo' }, { username: 'lacker' }]);

    itPaginates({
      rootField: 'user',
      rootFieldArg: '(id: "583291a1638566b3c5a92ca0")',
      field: 'tweetsConnection',
      subfield: 'id',
    }, [{ id: '583676d3618530145474e350' }, { id: '583676d3618530145474e351' }]);

    itPaginates({
      rootField: 'user',
      rootFieldArg: '(id: "583291a1638566b3c5a92ca0")',
      field: 'likedConnection',
      subfield: 'id',
    }, [
      { id: '583676d3618530145474e352' },
      { id: '583676d3618530145474e353' },
      { id: '583676d3618530145474e354' },
    ]);
  });

 describe('tweetsConnection', () => {
    itQueries('basic data',
      '{ tweet(id: "583676d3618530145474e351") { id, body } }',
      { tweet: { id: '583676d3618530145474e351', body: 'Good times bringing Apollo Optics to Rails over the last few months with @tmeasday @chollier @cjoudrey @rmosolgo and others!' } }
    );

    itQueries('author relation',
      '{ tweet(id: "583676d3618530145474e351") { author { username } } }',
      { tweet: { author: { username: 'tmeasday' } } }
    );

    itPaginates({
      field: 'tweets',
      subfield: 'id',
    }, [
      { id: '583676d3618530145474e350' },
      { id: '583676d3618530145474e351' },
      { id: '583676d3618530145474e352' },
      { id: '583676d3618530145474e353' },
      { id: '583676d3618530145474e354' },
      { id: '583676d3618530145474e355' },
    ]);

    itPaginates({
      rootField: 'tweet',
      rootFieldArg: '(id: "583676d3618530145474e353")',
      field: 'likersConnection',
      subfield: 'username'
    }, [{ username: 'tmeasday' }, { username: 'lacker' }]);
  });
});
