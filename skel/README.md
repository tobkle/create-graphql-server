# create-graphql-server
This is a generated create-graphql-server app.

* Authentication: Identifies an user
* Authorization: Defines all actions a user is allowed to perform

## Implementing Authentication
The authentication is performed in those locations:
* ./server/index.js
* ./server/authenticate.js
* ./model/index.js

### ./server/index.js
In the server, the database is started, and the UserCollection is defined. That's where the server accesses the user documents in the database.

In ```js authenticate(app, UserCollection)``` the authentication is prepared and processed. Later, if a user sends a 'graphql' request, the user is determined with ```js passport.authenticate(...)```. After that, the user is whether an anonymous user or an authenticated user. You find the identified user in the object "me". Then the type models have to be initialized with the user "me" authorizations: ```js req.context = addModelsToContext({... me ...})```.

By-the-way: The server/index.js is able to access the User collection directly by the following two lines. This is used in the server/authenticate.js during authenticate.
```js
... 
const UserCollection = db.collection('user');
...
authenticate(app, UserCollection);
...
```

### ./model/index.js
If there is a User model generated, then we load it as the first model. It defines the model, which will be used in the other models as well, to perform the authorization checks. 

```javascript
const models = {};

export default function addModelsToContext(context) {
  const newContext = Object.assign({}, context);
  
  // User model has to be first, to initialize the other models with correct authorizations
  if (models['User']){
    newContext['User'] = new models['User'](newContext);
  }

  Object.keys(models).forEach((key) => {
    if (key !== 'User') newContext[key] = new models[key](newContext);
  });
  return newContext;
}

import Tweet from './Tweet';
models.Tweet = Tweet;

import User from './User';
models.User = User;
```

### ./server/authenticate.js
Here, the real identification of an user is performed. After a user requested a '/login' url with user and password. The user's email is searched in the database. If it is there, it checks if the user's encrypted hash is equal to the encrypted password. If so, a user is identified and a JWT token is generated and transfered back to the requesting user. This JWT token is usually stored in the client's browsers local storage and added to the next call in the Authorization header. With all the next requests of that user, he sends an header like...
```javacript
authorization JWT calculated.JWT.token
```
This JWT token is decrypted with an internal secret KEY to get the user id. This user is then read from the cache/database within userFromPayload and returned to the request as the user object "me", which is then used in all "/graphql" calls.

```javascript
import passport from 'passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import jwt from 'jwt-simple';
import { ObjectId } from 'mongodb';
import nodeify from 'nodeify';
import bcrypt from 'bcrypt';
import DataLoader from 'dataloader';
import { findByIds } from 'create-graphql-server-find-by-ids';

const KEY = 'test-key';
let Loader;

async function userFromPayload(request, jwtPayload) {
  if (!jwtPayload.userId) {
    throw new Error('No userId in JWT');
  }
  return await Loader.load(ObjectId(jwtPayload.userId));
}

passport.use(new Strategy({
  jwtFromRequest: ExtractJwt.fromAuthHeader(),
  secretOrKey: KEY,
  passReqToCallback: true,
}, (request, jwtPayload, done) => {
  nodeify(userFromPayload(request, jwtPayload), done);
}));

export default function addPassport(app, User) {
  Loader = new DataLoader(ids => findByIds(User, ids));
  
  app.use(passport.initialize());

  app.post('/login', async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new Error('Username or password not set on request');
      }

      const user = await User.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.hash))) {
        throw new Error('User not found matching email/password combination');
      }

      const payload = {
        userId: user._id.toString(),
      };

      const token = jwt.encode(payload, KEY);
      res.json({ token });
    } catch (e) {
      next(e);
    }
  });
}
```

## Implementing Authorizations
Use the @authorize directive in a \<type\>.graphql input file, to define which authorizations should be generated by create-graphql-server. You can define user-roles and document-roles to control authorizations.

* user-roles: e.g. User.role = "admin", all admins are allowed to do create, read, update, delete,...
* document-roles: e.g. Tweet.authorId = User._id, only authors are allowed to create, update, delete a document

Use the following syntax for the Tweet.graphql input file::
```javascript
type Tweet 

@authorize(
  admin: ["create", "read", "update", "delete"], 
  author: ["create", "read", "update", "delete"], 
  coauthors: ["read", "update"],
  world: ["read"]
)

{
  author: User! @unmodifiable @belongsTo @authRole(for: ["author"])
  coauthors: [User] @belongsTo @authRole(for: ["coauthors"])
  body: String!

  likers: [User!] @hasAndBelongsToMany(as: "liked")
}
```

This has the following meaning:
* user-roles: "admin", "world" are created. (user-roles don't have own fields of type User or [User] in the document).
  Thus it will check, if the logged in user has a role "admin". Or if there is a special role "world", which just means every known or unknown user is allowed. For "world" authorization you don't have to be logged in.
  So each "admin" user will be able to create, read, update or delete the Tweet document.
  Everyone ("world") will be allowed to read all Tweets.
* document-roles: "author", "coauthors" are created. (Document-roles have a corresponding field in the document.)
  Look for the fields with the directive @authRole("...")
  Only the author of a Tweet is allowed to create, read, update, delete its single Tweet.
  Only a coauthor of a Tweet is allowed to read and update a Tweet, but he is not allowed to create a Tweet for a different author, and also not to delete a tweet of a different user.

and for the User.graphql input file:
```javascript
type User

@authorize(
  admin: ["create", "read", "update", "delete"]
  this: ["read", "update", "delete"]
)

{
  role: String @authRole(for: ["admin"]) 
  username: String!

  bio: String
  notify: Boolean

  tweets(minLikes: Int): [Tweet!] @hasMany(as: "author")
  liked: [Tweet!] @belongsToMany

  following: [User!] @belongsToMany
  followers: [User!] @hasAndBelongsToMany(as: "following")
}
```

This has the following meaning:
* user-role: "admin", is created. (user roles don't have own fields of type User or [User] in the document)
  It is a String field with: **role: String! @authRole("admin")**
  This will check, if the logged in user has a role "admin".
  So each "admin" user will be able to create, read, update or delete any User document.
* document-role: "this", is created (document roles have own fields in the document, but this is a special case for the field _id, which is not shown in the input type, but will be generated in the later schema file.)
  Only the user id of "this" meaning _id is allowed  to readOne, update, delete its single User document.

Use create-graphql-server command to generate the according schema, resolver, model files with the create-graphql-server command line interface. After its generation, you will find the generated files in the sub folders: schema, resolvers, model. The generated model files will use the following functions to implement the authorization logic.

## create-graphql-server-authorization
Install it with:
```bash
npm install create-graphql-server-authorization
```
[Github: create-graphql-server-authorization](https://github.com/tobkle/create-graphql-server-authorization)

[Please have a look in the API documentation.](https://tobkle.github.io/create-graphql-server-authorization/)

This uses the following functions from that module:

### function authlog
A logging function that understands "resolvers", "modes" and "users". Simple wrapper around whatever logging function we use.

### function findByIds (create-graphql-server-find-by-ids)
This is an extended version of [mongo-find-by-ids](https://github.com/tmeasday/mongo-find-by-ids).
The enhancement is only to provide an additional authQuery object, to extend the query to meet additional authorizations.

### function protectFields
Use function protectFields to protect single fields from access. Provide signed in user in "me", the authorized User roles for the protected field(s) - meaning the user who is allowed to access the field -, provide an array with protected fields, and the current document object, which is to be checked for protected fields and the User model context.

### function checkAuthDoc
Use function checkAuthDoc to check and get back the document. Especially used in insert operations, to figure out, if the toBeInsertedDoc is valid to be added by this userRole, docRole and action.

### function loggedIn
Use function loggedIn, to check if a user is logged in.

### function queryForRoles
Use function queryForRoles to generate an authQuery object.

It expects the following arguments with the meanings:
* **me:** this is the logged in user object out of the resolver's context
* **userRoles:** an array with userRoles, which was generated by the @authorize directives in the <type>.graphql file
* **docRoles:** an array with docRoles, which was generated by the @authorize directives in the <type>.graphql file
* **User:** User context to access the User model 
* **logger:** logging function e.g. ```js authlog(resolver, mode, me) ```
	* **resolver:** this is a string with the resolver's name, optional, only for easier debugging
	* **mode:** this is the current mode of operation:
		* **create:** insert a record to the database
		* **read:** read a record or many records from the database
			* **readOne:** read only a single record from the database
			* **readMany:** read many records from the the database
		* **update:** update a record in the database
		* **delete:** remove a record from the database
	* **me:** the user object, who is executing the request, and who is checked for authorization

### function userRoleAuthorized
This helper function is used by queryForRoles, and decides, if a user gains the authorization by its role.
For example: If a user has a field "role" in his user document and it contains the value "admin". So it checks if a user's role is admin, and allows all operations for admins.

### function fieldContainsUserId
This helper function is used in the models and checks, if the provided field of types: array, object or string contains the userId.

### ./resolver/User.js
In the resolver interfaces, there are different objects:
* the root object "tweet", contains the document fields
* the args object "args", contains arguments from the graphql query/mutation
* the context object "Tweet", contains the access to the database model of the Tweet collection
* the context object "me", contains the current logged in user -if logged in-, which is provided from the server's passport implementation
* the last argument in the resolver function is the resolver's name, which is optional and only to enhance the logging in debugging mode by additional information. If you have to analyze authorization outcomes, this helps a lot to figure out, which resolvers authorization rule fired.

### ./resolver/Tweet.js
In the resolver interfaces, there are different objects:
* the root object "tweet", contains the document fields
* the args object "args", contains arguments from the graphql query/mutation
* the context object "Tweet", contains the access to the database model of the Tweet collection
* the context object "me", contains the current logged in user -if logged in-, which is provided from the server's passport implementation
* the last argument in the resolver function is the resolver's name, which is optional and only to enhance the logging in debugging mode by additional information. If you have to analyze authorization outcomes, this helps a lot to figure out, which resolvers authorization rule fired.

### Testing
If you run within the project root at least one time, it generates the database and adds the seed tweet and user documents once during each run.
```bash
yarn end-to-end-test
```
It executes many pre-defined tests with different user-roles and document-roles. May be you want to add additional tests to enhance the security of the logic.

If you want to test with the http://localhost:3000/graphiql frontend, best download the following app:
```bash
brew cask install graphiql
```
...and have a look into the file **./test/output-app-end-to-end/scripts/JWTs.txt**, or generate this file by running:
```bash
cd ./test/output-app-end-to-end/scripts
babel-node ./generateJWT.js > JWTs.txt
```
This generates JWT tokens for the different test users from the ./test/seeds/User.json. Copy the wanted JWT token of the different users, and start the GraphiQL app with the following entries:

* GraphQL endpoint: ```http://localhost:3000/graphql```
* Method: ```POST```
* Edit HTTP headers:
  * Header name: ```authorization```
  * Header value: ```JWT the-copied-token``` 

...and write and execute your queries/mutations in the GraphiQL window.

If you use different user's JWT tokens, you can simulate the different user roles such as "admin", "editor" and "user" manually.