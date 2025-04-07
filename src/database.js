//2025 Munro Research Limited, All rights reserved
const {MongoClient, ObjectId} = require('mongodb');
const crypto = require('crypto');

const client = new MongoClient(`${process.env.DATABASE_PROTOCOL}://${process.env.DATABASE_USERNAME}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_URL}/${process.env.DATABASE_NAME}`);

async function getUser(query) {
    await client.connect();
    const users = client.db(process.env.DATABASE_NAME).collection(process.env.USER_COLLECTION);

    return await users.findOne(query);
}

async function getUsers(query) {
    await client.connect();
    const users = client.db(process.env.DATABASE_NAME).collection(process.env.USER_COLLECTION);

    return await users.findMany(query).toArray();
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

module.exports = {
    getUser, replaceUser, saveNewUser, deleteUser, getMetrics, getUsersReferredBy, getUsers
}