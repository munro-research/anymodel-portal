//2025 Munro Research Limited, All rights reserved

const express = require('express');
const bcrypt = require('bcrypt');
const compression = require('compression')
const bodyParser = require("body-parser");
require("dotenv").config(); 

const log = require("./log.js");
const database = require("./database.js")

const SALT_ROUNDS = Number(process.env.SALT_ROUNDS);

var app = express();

//response body compression
app.use(compression())

app.use(express.static('public-html'))

//json middleware
app.use(bodyParser.json({limit: process.env.MAX_PAYLOAD_BYTES}));

//respond to healthcheck
app.get('/', (req, res) => {
    res.status(200).send();
});

app.post("/login", async (req, res) => {
    try {
        const { credentials } = req.body;
        const { email, password } = credentials;
    
        let user = await login(email, password);
    
        if (user.privilege) {
            res.status(200).json({
                privilege: user.privilege,
            });
        }
        else throw new Error("User lacks permission");
    } catch (err) {
        log.error(err);
        res.status(400).json({error: err.message});
    }
})

app.post("/view-user", async (req, res) => {
    try {
        const { credentials, userEmail } = req.body;
        const { email, password } = credentials;
    
        let user = await login(email, password);
    
        if (user.privilege == "admin") {
            let retrievedUser =  await database.getUser({email: userEmail.toLowerCase()});

            if (retrievedUser) {
                res.status(200).json({
                    user: retrievedUser,
                });
            } else throw new Error("User not found");
        }
        else throw new Error("User lacks permission");
    } catch (err) {
        log.error(err);
        res.status(400).json({error: err.message});
    }
})

app.post("/delete-user", async (req, res) => {
    try {
        const { credentials, userEmail } = req.body;
        const { email, password } = credentials;
    
        let user = await login(email, password);
    
        if (user.privilege == "admin") {
            let retrievedUser =  await database.getUser({email: userEmail.toLowerCase()});

            if (retrievedUser) {
                await database.deleteUser(retrievedUser._id);
                res.status(200).send();
            } else throw new Error("User not found");
        }
        else throw new Error("User lacks permission");
    } catch (err) {
        log.error(err);
        res.status(400).json({error: err.message});
    }
})

app.post("/ban-user", async (req, res) => {
    try {
        const { credentials, userEmail } = req.body;
        const { email, password } = credentials;
    
        let user = await login(email, password);
    
        if (user.privilege == "admin") {
            let retrievedUser =  await database.getUser({email: userEmail.toLowerCase()});

            if (retrievedUser) {
                user.banned = true;
                await database.replaceUser(user)
                res.status(200).send();
            } else throw new Error("User not found");
        }
        else throw new Error("User lacks permission");
    } catch (err) {
        log.error(err);
        res.status(400).json({error: err.message});
    }
})

app.post("/unban-user", async (req, res) => {
    try {
        const { credentials, userEmail } = req.body;
        const { email, password } = credentials;
    
        let user = await login(email, password);
    
        if (user.privilege == "admin") {
            let retrievedUser =  await database.getUser({email: userEmail.toLowerCase()});

            if (retrievedUser) {
                user.banned = false;
                await database.replaceUser(user)
                res.status(200).send();
            } else throw new Error("User not found");
        }
        else throw new Error("User lacks permission");
    } catch (err) {
        log.error(err);
        res.status(400).json({error: err.message});
    }
})

app.post("/create-user", async (req, res) => {
    try {
        const { credentials, newUser } = req.body;
        const { email, password } = credentials;
    
        let user = await login(email, password);
    
        if (user.privilege == "admin") {
            let anyModelOptions = await getAnyModelOptions();

            let findByEmail = await database.getUser({email: newUser.email});
            if (findByEmail) throw new Error("Email already used");

            let renewDate = new Date();
            renewDate.setMonth(renewDate.getMonth() + 1);

            await database.saveNewUser({
                username: newUser.email, 
                email: newUser.email, 
                auth: {
                    hashedPassword: await bcrypt.hash(newUser.password, SALT_ROUNDS),
                    changePassword: newUser.changePassword,
                },
                signUpDate: new Date(),
                renewDate: newUser.plan == "trial" ? null : renewDate.getTime() / 1000,
                plan: newUser.plan,
                subscriptionStatus: newUser.plan == "trial" ? "trial" : "active",
                emailConsent: null, 
                analyticsConsent: null,
                credits: Number(anyModelOptions.plans[newUser.plan].credits),
                paymentService: newUser.paymentService,
            });

            res.status(200).send();
        }
        else throw new Error("User lacks permission");
    } catch (err) {
        log.error(err);
        res.status(400).json({error: err.message});
    }
})

async function getAnyModelOptions() {
    let response = await fetch(`${process.env.API_URL}/supported-options`);
    return await response.json();
}

async function login(email, password) {
    let user = await database.getUser({email: email.toLowerCase()});

    if (user == undefined) throw new Error("Authentication Failed")

    if (await bcrypt.compare(password, user.auth.hashedPassword)) {
        return user;
    } else throw new Error("Authentication Failed");
}
  
app.listen(process.env.PORT, () => {
    log.info(`Listening on port ${process.env.PORT}`);
});