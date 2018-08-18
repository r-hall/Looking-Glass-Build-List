const Twitter = require('twitter');
const authAPI = require('./config/twitter.js');
const Users = require('./db.js').Users;
const Lists = require('./db.js').Lists;
const delay = require('./delay.js');
/*
    necessary information to build list is already stored in Lists collection
    input: user (id) whose tokens will be used, name of list
    output: none
*/

const createListEndpoint = 'lists/create';
const addListMembersEndpoint = 'lists/members/create_all';
const maxDailyInsertions = 900; // add safe amount to list each day, assuming some added by user outside of this app

const buildList = async (authenticatingUser, listName) => {
	return new Promise(async (resolve, reject) => {
		try {
            let listInfo = await Lists.findOne({ 'id': listName });
            let user = await Users.findOne({ 'id': authenticatingUser });
            let client = new Twitter({
                consumer_key: authAPI.TWITTER_CONSUMER_KEY,
                consumer_secret: authAPI.TWITTER_CONSUMER_SECRET,
                access_token_key: user.tokenKey,
                access_token_secret: user.tokenSecret
            });
            let slug;
            if (listInfo.currentBatch === 0) {
                // create list
                let createParams = {
                    'name': listName,
                    'mode': 'private'
                }
                let list = await client.post(createListEndpoint, createParams);
                slug = list.slug;
            }
            let currentFriends = listInfo.friends.slice(listInfo.currentBatch * maxDailyInsertions, (listInfo.currentBatch + 1) * maxDailyInsertions);
            let numberRequests = Math.ceil(currentFriends.length / 100);
            for (let i = 0; i < numberRequests; i++) {
                await delay(1000);
                let friendsBatch = currentFriends.slice(i * 100, (i + 1) * 100).join(',');
                let params = {
                    'slug': slug ? slug : listInfo.slug,
                    'owner_id': user.id,
                    'user_id': friendsBatch
                }
                await client.post(addListMembersEndpoint, params);
            }
            let newCurrentBatch = listInfo.currentBatch + 1;
            let query = { 'id': listName };
            let updateObject = {
                'slug': slug ? slug : listInfo.slug,
                'owner_id': user.id,
                'currentBatch': newCurrentBatch,
                'done': newCurrentBatch === listInfo.batches,
                'refreshedListDate': new Date()
            }
            Lists.findOneAndUpdate(query, updateObject);
		} catch(error) {
			console.log('error in buildList', error);
			reject(false);
		}
	})
}

module.exports = buildList;