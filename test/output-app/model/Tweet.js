import _ from 'lodash';
import { ObjectID } from 'mongodb';
import log from '../server/logger';
import DataLoader from 'dataloader';
import { auth, findByIds, queryForRoles, userAuthorizedForDoc } from '../authorizations';

export default class Tweet {
  constructor(context) {
    this.context = context;
    this.collection = context.db.collection('tweet');
    this.pubsub = context.pubsub;
    this.loader = new DataLoader((ids, authQuery = {}) => findByIds(this.collection, ids, authQuery));
    this.type = 'Tweet';
    this.userRoles = auth[this.type].userRoles;
    this.docRoles = auth[this.type].docRoles;
  }

  findOneById(id, _user = {}, resolver = '') {
    const authQuery = queryForRoles(_user, this.userRoles.readOne, this.docRoles.readOne, { User: this.context.User });
    log.debug(`${resolver} findOneById readOne with user ${(_user && _user.username) ? _user.username : '<no-user>'} for ${this.type} and ${id}`);
    log.debug('authQuery:', JSON.stringify(authQuery, null, 2));
    if (authQuery === false) {
      throw new Error(`Not authorized to readOne ${this.type} ${id}.`);
    }
    return this.loader.load(id, authQuery);
  }

  all({ lastCreatedAt = 0, limit = 10 }, _user, resolver = '') {
    const baseQuery = { createdAt: { $gt: lastCreatedAt } };
    const authQuery = queryForRoles(_user, this.userRoles.readMany, this.docRoles.readMany, { User: this.context.User });
    const finalQuery = {...baseQuery, ...authQuery};
    log.debug(`${resolver} all readMany with user ${(_user && _user.username) ? _user.username : '<no-user>'} for ${this.type}`);
    if (authQuery != {}) log.debug('authQuery:', JSON.stringify(authQuery, null, 2));
    if (authQuery === false) {
      throw new Error(`Not authorized to readMany ${this.type}.`);
    }
    return this.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  author(tweet, _user) {
    return this.context.User.findOneById(tweet.authorId, _user, 'author');
  }

  createdBy(tweet, _user) {
    return this.context.User.findOneById(tweet.createdById, _user, 'createdBy');
  }

  updatedBy(tweet, _user) {
    return this.context.User.findOneById(tweet.updatedById, _user, 'udpatedBy');
  }

  coauthors(tweet, { lastCreatedAt = 0, limit = 10 }, _user) {
    const baseQuery = {_id: { $in: tweet.coauthorsIds }, createdAt: { $gt: lastCreatedAt } };
    const authQuery = queryForRoles(_user, this.userRoles.readMany, this.docRoles.readMany, { User: this.context.User });
    const finalQuery = {...baseQuery, ...authQuery};
    log.debug(`coauthors readMany with user ${(_user && _user.username) ? _user.username : '<no-user>'} for ${this.type}`);
    log.debug('authQuery:', JSON.stringify(authQuery, null, 2));
    if (authQuery === false) {
      throw new Error(`coauthors Not authorized to readMany ${this.type} ${id}.`);
    }
    return this.context.User.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  likers(tweet, { lastCreatedAt = 0, limit = 10 }, _user) {
    const baseQuery = {likedIds: tweet._id, createdAt: { $gt: lastCreatedAt } };
    const authQuery = queryForRoles(_user, this.userRoles.readMany, this.docRoles.readMany, { User: this.context.User });
    const finalQuery = {...baseQuery, ...authQuery};
    log.debug(`likers readMany with user ${(_user && _user.username) ? _user.username : '<no-user>'} for ${this.type}`);
    log.debug('authQuery:', JSON.stringify(authQuery, null, 2));
    if (authQuery === false) {
      throw new Error(`coauthors Not authorized to readMany ${this.type} ${id}.`);
    }
    return this.context.User.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  async insert(doc, _user) {
    let docToInsert = Object.assign({}, doc, {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdById: (_user && _user._id) ? _user._id : 'unknown',
        updatedById: (_user && _user._id) ? _user._id : 'unknown',
    });

    const authQuery = queryForRoles(_user, this.userRoles.create, this.docRoles.create, { User: this.context.User });
    if (authQuery === false || (authQuery !== {} && !userAuthorizedForDoc(_user, this.docRoles.create, doc)) ) {
      throw new Error(`Not authorized to insert ${this.type} ${id}.`);
    }
    
    const id = (await this.collection.insertOne(docToInsert)).insertedId;
    
    if (id){
      log.debug(`inserted ${this.type} ${id}.`);
    } else {
      log.debug('insert failed for docToInsert:', JSON.stringify(docToInsert, null, 2));
      throw new Error(`insert not possible for ${this.type} ${id}.`);
    }

    this.pubsub.publish('tweetInserted', await this.findOneById(id));
    return id;
  }

  async updateById(id, doc, _user) {
    let docToUpdate = {$set: Object.assign({}, doc, {
          updatedAt: Date.now(),
          updatedById: (_user && _user._id) ? _user._id : 'unknown',
    })};

    const baseQuery = {_id: id};
    const authQuery = queryForRoles(_user, this.userRoles.update, this.docRoles.update, { User: this.context.User });
    if (authQuery === false) {
      throw new Error(`Not authorized to update ${this.type} ${id}.`);
    }

    const finalQuery = {...baseQuery, ...authQuery};
    const result = await this.collection.updateOne(finalQuery, docToUpdate);
    
    if (result.result.ok === 1 && result.result.n === 1){
      log.debug(`updated ${this.type} ${id}.`);
    } else {
      log.debug(`update failed finalQuery:`, JSON.stringify(finalQuery, null, 2));
      log.debug('update failed for docToUpdate:', JSON.stringify(docToUpdate, null, 2));
      throw new Error(`update not possible for ${this.type} ${id}.`);
    }

    this.loader.clear(id);
    this.pubsub.publish('tweetUpdated', await this.findOneById(id));
    return result;
  }

  async removeById(id, _user) {
    const baseQuery = {_id: id};
    const authQuery = queryForRoles(_user, this.userRoles.delete, this.docRoles.delete, { User: this.context.User });
    if (!authQuery) throw new Error(`Not authorized to remove ${this.type} ${id}.`);

    const finalQuery = {...baseQuery, ...authQuery};
    const result = await this.collection.remove(finalQuery);

    if (result.result.ok === 1 && result.result.n === 1){
      log.info(`removed ${this.type} ${id}.`);
    } else {
      log.debug(`remove failed for finalQuery:`, JSON.stringify(finalQuery, null, 2));
      throw new Error(`remove not possible for ${this.type} ${id}.`);
    }

    this.loader.clear(id);
    this.pubsub.publish('tweetRemoved', id);
    return result;
  }
}
