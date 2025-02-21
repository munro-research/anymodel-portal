const express = require('express');
const bcrypt = require('bcrypt');

const log = require("./log.js");
const database = require("./database.js")

const SALT_ROUNDS = Number(process.env.SALT_ROUNDS);

const router = express.Router();

router.post("/login", async (req, res) => {
    try {
        const { credentials } = req.body;
        const { email, password } = credentials;
    
        let user = await login(email, password);
    
        res.status(200).json({
            privilege: user.privilege,
            id: user._id,
        });
    } catch (err) {
        log.error(err);
        res.status(400).json({error: err.message});
    }
})

router.post("/view-user", async (req, res) => {
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

router.post("/delete-user", async (req, res) => {
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

router.post("/ban-user", async (req, res) => {
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

router.post("/unban-user", async (req, res) => {
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

router.post("/create-user", async (req, res) => {
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
                privilege: newUser.privilege,
                account: newUser.account,
            });

            res.status(200).send();
        }
        else throw new Error("User lacks permission");
    } catch (err) {
        log.error(err);
        res.status(400).json({error: err.message});
    }
})

router.post("/get-metrics", async (req, res) => {
    try {
        const { credentials } = req.body;
        const { email, password } = credentials;
    
        let user = await login(email, password);
    
        if (user.privilege == "admin") {
            let metrics = await database.getMetrics();
            res.status(200).json({metrics});
        }
        else throw new Error("User lacks permission");
    } catch (err) {
        log.error(err);
        res.status(400).json({error: err.message});
    }
})

router.post("/get-affiliate-status", async (req, res) => {
    try {
        const { credentials } = req.body;
        const { email, password } = credentials;

        let user = await login(email, password);

        const COMMISSIONS = {
            plan1: 2.25,
            plan2: 7.25,
            plan3: 0
        }

        let activeReferredSubscribers = {
            plan1: 0,
            plan2: 0,
            plan3: 0
        };

        let accumulatedThisPeriod = {
            plan1: 0,
            plan2: 0,
            plan3: 0
        };

        let referredUsers = await database.getUsersReferredBy(user._id);

        for (const referredUser of referredUsers) {
            if (referredUser.subscriptionCreated) {
                let signUpDate = referredUser.signUpDate;
                let subscriptionCreated = new Date(referredUser.subscriptionCreated * 1000);
                let timeElapsedSignUpToSubscribe = Math.floor(Math.abs(signUpDate - subscriptionCreated) / (1000 * 60 * 60 * 24));
                
                if (timeElapsedSignUpToSubscribe < REFERRAL_WINDOW) {
                    let subscriptionStatus = referredUser.subscriptionStatus;
                    let plan = referredUser.plan;

                    if (subscriptionStatus == "active") {
                        activeReferredSubscribers[plan]++;
                    }

                    let lastPayment = referredUser.lastPayment;

                    if (new Date().getMonth() == lastPayment.getMonth()) {
                        accumulatedThisPeriod[plan]++;
                    }
                }
            }
        }

        res.status(200).json({
            totalReferredUsers: referredUsers.length,
            activeSubscribers: activeReferredSubscribers,
            accumulatedThisPeriod: accumulatedThisPeriod,
            commissions: COMMISSIONS,
        });
    } catch (err) {
        log.error(err);
        res.status(400).json({error: err.message});
    }
    


});

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

module.exports = router;