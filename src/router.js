const express = require('express');
const bcrypt = require('bcrypt');
const stripe = require('stripe')(process.env.STRIPE_KEY);

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

        let retrievedUser = null;
    
        if (user.privilege == "admin") {
            retrievedUser =  await database.getUser({email: userEmail.toLowerCase()});
        } else if (user.privilege == "org-admin") {
            retrievedUser =  await database.getUser({email: userEmail.toLowerCase(), account: user.account});
        } else throw new Error("User lacks permission");

        if (retrievedUser) {
            delete retrievedUser.auth;

            res.status(200).json({
                user: retrievedUser,
            });
        } else throw new Error("User not found");
    } catch (err) {
        log.error(err);
        res.status(400).json({error: err.message});
    }
})

router.post("/view-account", async (req, res) => {
    try {
        const { credentials, name } = req.body;
        const { email, password } = credentials;
    
        let user = await login(email, password);

        let retrievedAccount = null;
    
        if (user.privilege == "admin") {
            retrievedAccount =  await database.getAccount(name);
        } else if (user.privilege == "org-admin") {
            retrievedAccount =  await database.getAccount(name);
            if (user.account != retrievedAccount.name) throw Error("User does not belong to account");
        }else throw new Error("User lacks permission");

        if (retrievedAccount) {
            res.status(200).json({
                account: retrievedAccount,
            });
        } else throw new Error("Account not found");
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

        let retrievedUsers = null;
        let max = 0;
        if (req.body.max) max = req.body.max;

        if (user.privilege == "admin") {
            retrievedUsers =  await database.getUsers({}, max);
        } else if (user.privilege == "org-admin") {
            retrievedUsers =  await database.getUsers({account: user.account}, max);
        } else throw new Error("User lacks permission");

        for (let user of retrievedUsers) {
            delete user.auth;
        }

        res.status(200).json({
            users: retrievedUsers,
        });
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

        console.log(userEmail);
    
        let user = await login(email, password);
    
        if (user.privilege == "admin") {
            let retrievedUser =  await database.getUser({email: userEmail.toLowerCase()});

            if (retrievedUser) {
                retrievedUser.banned = true;
                await database.replaceUser(retrievedUser)
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

        console.log(userEmail);
    
        let user = await login(email, password);
    
        if (user.privilege == "admin") {
            let retrievedUser =  await database.getUser({email: userEmail.toLowerCase()});

            if (retrievedUser) {
                retrievedUser.banned = false;
                await database.replaceUser(retrievedUser)
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
                    pendingUser.credits = 0;
                } else {
                    throw new Error("Account not found!");
                }
            } else {
                let renewDate = new Date();
                renewDate.setMonth(renewDate.getMonth() + 1);

                let paymentService  = null; 
                let plan = newUser.plan;

                if (plan.endsWith("-manual")) {
                    plan = plan.replaceAll("-manual", "");
            
                    if (plan != "trial") {
                        paymentService = "Manual";
                    }
                } else if (plan.endsWith("-extended-trial")) {
                    plan = plan.replaceAll("-extended-trial", "");
            
                    paymentService = "Extended Trial";
                }

                pendingUser.plan = plan;
                pendingUser.credits = anyModelOptions.plans[plan].credits ? Number(anyModelOptions.plans[plan].credits) : 0;
                pendingUser.subscriptionStatus = plan == "trial" ? "trial" : "active";
                pendingUser.renewDate = plan == "trial" ? null : renewDate.getTime() / 1000;
                pendingUser.paymentService = paymentService;
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

            let plan = newAccount.plan;
            let paymentService = null;
            let customerId = null;
            if (plan.endsWith("-manual")) {
                plan = plan.replaceAll("-manual", "");

                paymentService = "Manual";
            } else if (plan.endsWith("-stripe-invoice")) {
                plan = plan.replaceAll("-stripe-invoice", "");
        
                paymentService = "Stripe Invoice";
        
                const customer = await stripe.customers.create({
                    name: newAccount.name,
                    email: newAccount.billingEmail,
                });

                customerId = customer.id;
            }

            let account = {
                name: newAccount.name,
                billingEmail: newAccount.billingEmail,
                signUpDate: new Date(),
                subscriptionStatus: "active",
                plan: plan,
                renewDate: renewDate.getTime() / 1000,
                paymentService: paymentService,
                customerId: customerId,
                invoices: [],
            }

            if (newAccount.minSpendUSD) account.minSpendUSD = newAccount.minSpendUSD;
            if (newAccount.minSpendPerSeatUSD) account.minSpendPerSeatUSD = newAccount.minSpendPerSeatUSD;

            await database.saveNewAccount(account);

            res.status(200).send();
        } else throw new Error("User lacks permission");
    } catch (err) {
        log.error(err);
        res.status(400).json({error: err.message});
    }
})

router.post("/get-accounts", async (req, res) => {
    try {
        const { credentials } = req.body;
        const { email, password } = credentials;
    
        let user = await login(email, password);

        let max = 10;
        if (req.body.max) max = req.body.max;
    
        if (user.privilege == "admin") {
            let retrievedAccounts =  await database.getAccounts({}, max);

            res.status(200).json({
                accounts: retrievedAccounts,
            });
        } else throw new Error("User lacks permission");
    } catch (err) {
        log.error(err);
        res.status(400).json({error: err.message});
    }
})

router.post("/cancel-account", async (req, res) => {
    try {
        const { credentials, accountName } = req.body;
        const { email, password } = credentials;
    
        let user = await login(email, password);
    
        if (user.privilege == "admin") {
            let account = await database.getAccount(accountName);
            account.subscriptionStatus = "canceled";

            await database.replaceAccount(account);
            res.status(200).send();
        }
        else throw new Error("User lacks permission");
    } catch (err) {
        log.error(err);
        res.status(400).json({error: err.message});
    }
})

router.post("/activate-account", async (req, res) => {
    try {
        const { credentials, accountName } = req.body;
        const { email, password } = credentials;
    
        let user = await login(email, password);
    
        if (user.privilege == "admin") {
            let account = await database.getAccount(accountName);
            account.subscriptionStatus = "active";

            await database.replaceAccount(account);
            res.status(200).send();
        }
        else throw new Error("User lacks permission");
    } catch (err) {
        log.error(err);
        res.status(400).json({error: err.message});
    }
})

router.post("/delete-account", async (req, res) => {
    try {
        const { credentials, accountName } = req.body;
        const { email, password } = credentials;
    
        let user = await login(email, password);
    
        if (user.privilege == "admin") {
            await database.deleteAccountAndUsers(accountName);
            res.status(200).send();
        }
        else throw new Error("User lacks permission");
    } catch (err) {
        log.error(err);
        res.status(400).json({error: err.message});
    }
})

router.post("/usage", async (req, res) => {
    try {
        const { credentials, accountName } = req.body;
        const { email, password } = credentials;
    
        let user = await login(email, password);

        let account =  await database.getAccount(accountName);
        if (account) {
            if (user.privilege == "admin" || (user.privilege == "org-admin" && user.account == account.name)) {
                let {creditSpend, seats} = await database.calculateAccountCreditSpend(accountName);

                res.status(200).json({
                    renewDate: account.renewDate,
                    creditSpend: creditSpend,
                    seats: seats,
                });
            } else throw new Error("User lacks permission")
        } else throw new Error("Account not found");

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

            //account
            let account = await database.getAccount(accountName);

            if (!account) throw new Error("Account not found");
            if (account.paymentService != "Stripe Invoice") throw new Error("Stripe Invoice billing is not enabled for this account.");
            if (account.plan != "plan3") throw new Error("Account plan does not support invoices.");

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

            let spendUSD = creditsConsumed > 0 ?
                Math.ceil((creditsConsumed / anyModelOptions.plans.plan3.creditsPerDollar) * 100) / 100 : 0;

            let spendCents = spendUSD * 100;

            let subtotalUSD = Math.max(spendUSD, minSpendUSD);

            const invoice = await stripe.invoices.create({
                customer: account.customerId,
                currency: "usd",
                collection_method: "send_invoice",
                days_until_due: Number(process.env.INVOICE_DAYS_UNTIL_DUE),
                auto_advance: true,
            });

            await stripe.invoiceItems.create({
                invoice: invoice.id,
                customer: account.customerId,
                pricing: {
                price: process.env.ANYMODEL_CREDIT_PRICE_ID,
                },
                quantity: Math.round(spendCents)
            });

            if (spendUSD < minSpendUSD) {
                let unspentUSD = minSpendUSD - spendUSD;
                let unspentCents = unspentUSD * 100;

                await stripe.invoiceItems.create({
                    invoice: invoice.id,
                    customer: account.customerId,
                    pricing: {
                    price: process.env.ANYMODEL_UNSPENT_CREDIT_PRICE_ID,
                    },
                    quantity: Math.round(unspentCents)
                });
            }

            await stripe.invoices.finalizeInvoice(invoice.id, {auto_advance: true});

            account.invoices.push(invoice.id);

            await database.replaceAccount(account);

            res.status(200).json({creditsConsumed, spendUSD, seats, minSpendUSD, minSpendPerSeatUSD, subtotalUSD, invoiceId: invoice.id, billingEmail: account.billingEmail});
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