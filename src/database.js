//2025 Munro Research Limited, All rights reserved
const {MongoClient, ObjectId} = require('mongodb');
const crypto = require('crypto');

const client = new MongoClient(`${process.env.DATABASE_PROTOCOL}://${process.env.DATABASE_USERNAME}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_URL}/${process.env.DATABASE_NAME}`);

async function getUser(query) {
    await client.connect();
    const users = client.db(process.env.DATABASE_NAME).collection(process.env.USER_COLLECTION);

    return await users.findOne(query);
}

async function getUsers(query, max=0) {
    await client.connect();
    const users = client.db(process.env.DATABASE_NAME).collection(process.env.USER_COLLECTION);

    return await users.find(query).limit(max).toArray();
}

async function replaceUser(user) {
    await client.connect();
    const users = client.db(process.env.DATABASE_NAME).collection(process.env.USER_COLLECTION);

    await users.replaceOne({_id: user._id}, user);
}

async function saveNewUser(user) {
    await client.connect();
    const users = client.db(process.env.DATABASE_NAME).collection(process.env.USER_COLLECTION);

    //store hashed user id
    const response = await users.insertOne(user);
    let md5id = crypto.createHash('md5').update(response.insertedId.toString()).digest('hex').toString();
    await users.updateOne({_id: response.insertedId}, {$set: {"md5id":md5id}});
}

async function deleteUser(id) {
    await client.connect();
    const users = client.db(process.env.DATABASE_NAME).collection(process.env.USER_COLLECTION);

    await users.deleteOne({_id: id});
}

async function getAccount(name) {
    await client.connect();
    const accounts = client.db(process.env.DATABASE_NAME).collection(process.env.ACCOUNT_COLLECTION);

    return await accounts.findOne({name: name});
}

async function getAccounts(query, max=0) {
    await client.connect();
    const accounts = client.db(process.env.DATABASE_NAME).collection(process.env.ACCOUNT_COLLECTION);

    return await accounts.find(query).limit(max).toArray();
}

async function saveNewAccount(account) {
    await client.connect();
    const accounts = client.db(process.env.DATABASE_NAME).collection(process.env.ACCOUNT_COLLECTION);

    await accounts.insertOne(account);
}

async function replaceAccount(account) {
    await client.connect();
    const accounts = client.db(process.env.DATABASE_NAME).collection(process.env.ACCOUNT_COLLECTION);

    await accounts.replaceOne({_id: account._id}, account);
}

async function deleteAccountAndUsers(accountName) {
    await client.connect();
    const accounts = client.db(process.env.DATABASE_NAME).collection(process.env.ACCOUNT_COLLECTION);
    const users = client.db(process.env.DATABASE_NAME).collection(process.env.USER_COLLECTION);

    await users.deleteMany({account: accountName});
    await accounts.deleteOne({name: accountName});
}

async function calculateAccountCreditSpend(name) {
    await client.connect();
    const users = client.db(process.env.DATABASE_NAME).collection(process.env.USER_COLLECTION);

    let all = await users.find({account: name}).toArray();

    let total = 0;
    let count = 0;

    for (const user of all) {
        count++;
        total += user.credits;
    }

    return {creditSpend: total, seats: count};
}

async function getMetrics() {
    await client.connect();
    const metrics = client.db(process.env.DATABASE_NAME).collection(process.env.METRIC_COLLECTION);

    return await metrics.find({}).toArray();
}

async function getUsersReferredBy(id) {
    await client.connect();
    const users = client.db(process.env.DATABASE_NAME).collection(process.env.USER_COLLECTION);

    return await users.find({referredBy: id}).toArray();
}

async function getUserStates(id) {
    await client.connect();
    const states = client.db(process.env.DATABASE_NAME).collection(process.env.STATE_COLLECTION);

    return await states.find({user: id}).toArray();
}

module.exports = {
    getUser, replaceUser, saveNewUser, deleteUser, getUsers,
    getMetrics, getUsersReferredBy, 
    getAccount, saveNewAccount, replaceAccount, getAccounts, deleteAccountAndUsers,
    calculateAccountCreditSpend,
    getUserStates,
}