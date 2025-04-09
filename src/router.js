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
            account: user.account,
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

router.post("/get-users", async (req, res) => {
    try {
        const { credentials } = req.body;
        const { email, password } = credentials;
    
        let user = await login(email, password);

        let max = 10;
        if (req.body.max) max = req.body.max;
    
        if (user.privilege == "admin") {
            let retrievedUsers =  await database.getUsers({}, max);

            res.status(200).json({
                users: retrievedUsers,
            });
        } else if (user.privilege == "org-admin") {
            let retrievedUsers =  await database.getUsers({account: user.account}, max);
            
            res.status(200).json({
                users: retrievedUsers,
            });
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

            let pendingUser = {
                username: newUser.email, 
                email: newUser.email, 
                auth: {
                    hashedPassword: await bcrypt.hash(newUser.password, SALT_ROUNDS),
                    changePassword: newUser.changePassword,
                },
                signUpDate: new Date(),
                emailConsent: null, 
                analyticsConsent: null,
                privilege: newUser.privilege,
            };

            if (newUser.account) {
                let account = await database.getAccount(newUser.account);

                if (account) {
                    pendingUser.account = newUser.account;
                } else {
                    throw new Error("Account not found!");
                }
            } else {
                let renewDate = new Date();
                renewDate.setMonth(renewDate.getMonth() + 1);

                pendingUser.plan = newUser.plan;
                pendingUser.credits = anyModelOptions.plans[newUser.plan].credits ? Number(anyModelOptions.plans[newUser.plan].credits) : 0;
                pendingUser.subscriptionStatus = newUser.plan == "trial" ? "trial" : "active";
                pendingUser.renewDate = newUser.plan == "trial" ? null : renewDate.getTime() / 1000;
                pendingUser.paymentService = newUser.paymentService;
            }

            await database.saveNewUser(pendingUser);

            res.status(200).send();
        }
        else if (user.privilege == "org-admin") {
            await database.saveNewUser({
                username: newUser.email, 
                email: newUser.email, 
                auth: {
                    hashedPassword: await bcrypt.hash(newUser.password, SALT_ROUNDS),
                    changePassword: newUser.changePassword,
                },
                signUpDate: new Date(),
                emailConsent: false, 
                analyticsConsent: false,
                credits: 0,
                privilege: null,
                account: user.account,
            });

            res.status(200).send();
        }
        else throw new Error("User lacks permission");
    } catch (err) {
        log.error(err);
        res.status(400).json({error: err.message});
    }
})

router.post("/create-account", async (req, res) => {
    try {
        const { credentials, newAccount } = req.body;
        const { email, password } = credentials;

        let user = await login(email, password);

        if (user.privilege == "admin") {
            let existingAccount = await database.getAccount(newAccount.name);
            if(existingAccount) throw new Error("Account with this name already exists");

            let renewDate = new Date();
            renewDate.setMonth(renewDate.getMonth() + 1);

            let account = {
                name: newAccount.name,
                signUpDate: new Date(),
                subscriptionStatus: "active",
                renewDate: renewDate.getTime() / 1000,
                paymentService: "Manual",
            }

            await database.saveNewAccount(account);

            res.status(200).send();
        } else throw new Error("User lacks permission");
    } catch (err) {
        log.error(err);
        res.status(400).json({error: err.message});
    }
})

router.post("/billing-info", async (req, res) => {
    try {
        const { credentials } = req.body;
        const { email, password } = credentials;
    
        let user = await login(email, password);
    
        if (user.privilege == "org-admin") {
            let account =  await database.getAccount(user.account);
            let creditSpend = await database.calculateAccountCreditSpend(user.account);
            
            res.status(400).json({
                renewDate: account.renewDate,
                creditSpend: creditSpend,
            });
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

router.post("/generate-invoice", async (req, res) => {
    try {
        const { credentials } = req.body;
        const { email, password } = credentials;
    
        let user = await login(email, password);
    
        if (user.privilege == "admin") {
            const accountName = req.body.account;

            let anyModelOptions = await getAnyModelOptions();
            let renewDate = new Date();
            renewDate.setMonth(renewDate.getMonth() + 1);

            let creditsConsumed = 0;
            let seats = 0;
            let minSpendUSD = 0;
            let minSpendPerSeatUSD = 0;

            if (accountName.includes("@")) {
                //user
                let user = await database.getUser({email: accountName});

                if (!user) throw new Error("User not found");
                if (user.paymentService != "Manual") throw new Error("Manual billing is not enabled for this user.");

                creditsConsumed = user.credits;
                user.credits = 0;
                user.renewDate = renewDate.getTime() / 1000;

                if (user.minSpendUSD) minSpendUSD = user.minSpendUSD;

                await database.replaceUser(user);
            } else {
                //account
                let account = await database.getAccount(accountName);

                if (!account) throw new Error("Account not found");
                if (account.paymentService != "Manual") throw new Error("Manual billing is not enabled for this account.");

                let users = await database.getUsers({account: account.name});
                for (const user of users) {
                    seats++;
                    creditsConsumed += user.credits;
                    user.credits = 0;
                    await database.replaceUser(user);
                }

                account.renewDate = renewDate.getTime() / 1000;

                if (account.minSpendUSD) minSpendUSD = account.minSpendUSD;
                if (account.minSpendPerSeatUSD) {
                    minSpendPerSeatUSD = account.minSpendPerSeatUSD;
                    minSpendUSD = minSpendPerSeatUSD * seats;
                }

                await database.replaceAccount(account);
            }

            let spendUSD = creditsConsumed > 0 ?
                Math.ceil((creditsConsumed / anyModelOptions.plans.plan3.creditsPerDollar) * 100) / 100 : 0;

            let subtotalUSD = Math.max(spendUSD, minSpendUSD);

            res.status(200).json({creditsConsumed, spendUSD, seats, minSpendUSD, minSpendPerSeatUSD, subtotalUSD});
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

        const REFERRAL_WINDOW = 30;
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