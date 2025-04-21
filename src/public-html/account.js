//2025 Munro Research Limited, All rights reserved

var account = null;

async function initAccount() {
    if (privilege == "admin" || privilege == "org-admin") {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const name = urlParams.get('name');
            account = await getAccount(name);
            console.log(account);

            populateAccount(account);

            safetySettingState();

            if (privilege == "admin") {
                for (const elem of document.getElementsByClassName("admin")) {
                    elem.style.display = "block";
                }

                for (const elem of document.getElementsByClassName("admin-row")) {
                    elem.style.display = "table-row";
                }
            }
        } catch(err) {
            console.log(err);
        }
    } else {
        window.location = LOG_OUT_URL;
    }
}

async function getAccount(name) {
    let response = await fetch(`/${PREFIX}/view-account`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials, name})
    });

    let json = await response.json();
    return json.account;
}

function populateAccount(account) {
    document.getElementById("account-id").innerHTML = account._id;
    document.getElementById("account-name").innerHTML = account.name;
    document.getElementById("account-email").innerHTML = account.billingEmail;
    document.getElementById("account-signup-date").innerHTML = new Date(account.signUpDate).toLocaleString();
    document.getElementById("account-plan").innerHTML = account.plan;
    document.getElementById("account-payment-service").innerHTML = account.paymentService == "Stripe Invoice" ? `<a href="https://dashboard.stripe.com/customers/${account.customerId}">Stripe Invoice</a>` : account.paymentService;
    document.getElementById("account-status").innerHTML = account.subscriptionStatus;
    document.getElementById("account-min-spend").innerHTML = account.minSpendUSD ? account.minSpendUSD : "n/a"
    document.getElementById("account-min-spend-per-seat").innerHTML = account.minSpendPerSeatUSD ? account.minSpendPerSeatUSD : "n/a"

    let invoices = "";
    
    for (const invoice of account.invoices) {
        invoices += `<li><a href="https://dashboard.stripe.com/invoices/${invoice}">${invoice}</a></li>`
    }   

    document.getElementById("account-invoices").innerHTML = invoices;

    populateUsage(account.name);

    document.getElementById("default-user-quota").value = account.defaultUserQuota;
    setSafetySettingState(account.defaultSafetySettings);
}

async function updateDefaultUserQuota() {
    let quota = document.getElementById("default-user-quota").value;
    await fetch(`/${PREFIX}/update-account-default-quota`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials, accountName: account.name, quota})
    });
}

async function updateDefaultUserSafety() {
    let settings = safetySettingState();
    
    await fetch(`/${PREFIX}/update-account-default-safety-settings`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials, accountName: account.name, settings})
    });
}