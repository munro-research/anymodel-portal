//2025 Munro Research Limited, All rights reserved
const {MongoClient, ObjectId} = require('mongodb');
const client = new MongoClient(`${process.env.DATABASE_PROTOCOL}://${process.env.DATABASE_USERNAME}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_URL}/${process.env.DATABASE_NAME}`);

async function getUser(query) {
    await client.connect();
    const users = client.db(process.env.DATABASE_NAME).collection(process.env.USER_COLLECTION);

    return await users.findOne(query);
}

module.exports = {
    getUser
}