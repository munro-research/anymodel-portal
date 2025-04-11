//2025 Munro Research Limited, All rights reserved

const PREFIX = "portal"

var credentials = null;
var privilege = null;
let account = null;
var id = null;
var metrics = null;

async function init() {
    let item = localStorage.getItem('credentials');
    if (item) {
        let loadedCredentials = JSON.parse(item);
        await processLogin(loadedCredentials.email, loadedCredentials.password);
    }
}

async function postLogin() {
    if (privilege == "admin") {
        metrics = await getMetrics();

        try{
            drawGraphs();
        } catch(err) {
            console.log(err);
        }
        

        for (const elem of document.getElementsByClassName("admin")) {
            elem.style.display = "block";
        }

        document.getElementById("new-account").value = account ? account : "";

        populateAccounts();
    } else if (privilege == "org-admin") {
        for (const elem of document.getElementsByClassName("org-admin")) {
            elem.style.display = "block";
        }

        document.getElementById("plans").innerHTML = `<option value="sub-account" selected>Sub account</option>`
        document.getElementById("plan-selection").style.display = "none";

        const org = document.getElementById("new-account");
        org.readOnly = true;
        org.value = account;

        document.getElementById("new-privilege").style.display = "none";
        document.getElementById("new-user-min-spend").style.display = "none";
        
        await billingInfo();
    }

    await affiliates();
}

async function logout() {
    localStorage.removeItem('credentials');
    window.location = "/portal/"
}

async function login() {
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    let error = await processLogin(email, password);
    if (error) {
        alert(error);
    }
}

async function processLogin(email, password) {
    let response = await fetch(`/${PREFIX}/login`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials: {email, password}})
    });

    let json = await response.json();

    if (response.status == 200) {
        credentials = {email, password};
        privilege = json.privilege;
        account = json.account;
        id = json.id;

        if (!privilege) privilege = "standard"

        document.getElementById("logged-out").style.display = "none";
        document.getElementById("logged-in").style.display = "block";
        document.getElementById("logged-in-msg").innerHTML = `Logged in as ${credentials.email} (${privilege})`;

        localStorage.setItem('credentials', JSON.stringify(credentials));

        postLogin();

        return null;
    } else {
        localStorage.removeItem('credentials');
        return json.error;
    }
}

async function viewUser() {
    let userEmail = document.getElementById("user-email").value;

    let response = await fetch(`/${PREFIX}/view-user`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials, userEmail})
    });

    let json = await response.json();

    if (response.status == 200) {
        document.getElementById("user-json").innerHTML = JSON.stringify(json.user);
    } else {
        alert(json.error);
    }
}

async function deleteUser() {
    let userEmail = document.getElementById("delete-email1").value;
    let userEmail2 = document.getElementById("delete-email2").value;

    if (userEmail != userEmail2) {
        alert("Emails don't match!");
        return;
    }

    let response = await fetch(`/${PREFIX}/delete-user`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials, userEmail})
    });

    if (response.status == 200) {
        alert(`User '${userEmail}' deleted`);
    } else {
        let json = await response.json();
        alert(json.error);
    }
}

async function banUser() {
    let userEmail = document.getElementById("ban-email").value;

    let response = await fetch(`/${PREFIX}/ban-user`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials, userEmail})
    });

    if (response.status == 200) {
        alert(`User '${userEmail}' banned`);
    } else {
        let json = await response.json();
        alert(json.error);
    }
}

async function unbanUser() {
    let userEmail = document.getElementById("unban-email").value;

    let response = await fetch(`/${PREFIX}/unban-user`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials, userEmail})
    });

    if (response.status == 200) {
        alert(`User '${userEmail}' unbanned`);
    } else {
        let json = await response.json();
        alert(json.error);
    }
}

async function createUser() {
    let email = document.getElementById("new-email").value;
    let password = document.getElementById("new-password").value;
    let plan = document.getElementById("plans").value; 
    let changePassword = document.getElementById("change-password").checked;
    let minSpendUSD = document.getElementById("min-spend").valueAsNumber;

    let account = document.getElementById("new-account").value;
    if (account == "") account = null;
    
    let privilegeLevel = document.getElementById("new-privilege").value;
    if (privilegeLevel == "null") privilegeLevel = null;


    let response = await fetch(`/${PREFIX}/create-user`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials, newUser: {email, password, plan, changePassword, account, privilege: privilegeLevel, minSpendUSD}})
    });

    if (response.status == 200) {
        alert(`User '${email}' created`);
    } else {
        let json = await response.json();
        alert(json.error);
    }
}

async function createAccount() {
    let name = document.getElementById("new-account-name").value;
    let minSpend = document.getElementById("monthly-min-spend").valueAsNumber;
    let plan = document.getElementById("account-plans").value; 
    let billingEmail = document.getElementById("billing-email").value;

    let newAccount = {name, plan, billingEmail};

    if (document.getElementById('total-min-spend').checked) newAccount.minSpendUSD = minSpend;
    if (document.getElementById('per-seat-min-spend').checked) newAccount.minSpendPerSeatUSD = minSpend;

    let response = await fetch(`/${PREFIX}/create-account`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials, newAccount})
    });

    if (response.status == 200) {
        alert(`Account '${name}' created`);
        populateAccounts();
    } else {
        let json = await response.json();
        alert(json.error);
    }
}

async function getMetrics() {
    let response = await fetch(`/${PREFIX}/get-metrics`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials})
    });

    let json = await response.json();
    return json.metrics;
}

async function affiliates() {
    document.getElementById("landing-page-affiliate-link").innerHTML = `<a href="https://www.anymodel.xyz?referredBy=${id}">https://www.anymodel.xyz?referredBy=${id}</a>`
    document.getElementById("marketers-page-affiliate-link").innerHTML = `<a href="https://www.anymodel.xyz/marketers?referredBy=${id}">https://www.anymodel.xyz/marketers?referredBy=${id}</a>`
    document.getElementById("signup-affiliate-link").innerHTML = `<a href="https://app.anymodel.xyz?signup=true&referredBy=${id}">https://app.anymodel.xyz?signup=true&referredBy=${id}</a>`

    let response = await fetch(`/${PREFIX}/get-affiliate-status`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials})
    });

    let json = await response.json();
    
    document.getElementById("total-referred-users").innerHTML = json.totalReferredUsers;
    document.getElementById("total-subscribed-users").innerHTML = json.activeSubscribers.plan1 + json.activeSubscribers.plan2 + json.activeSubscribers.plan3;
    document.getElementById("total-referred-plan1-users").innerHTML = json.activeSubscribers.plan1;
    document.getElementById("total-referred-plan2-users").innerHTML = json.activeSubscribers.plan2;
    document.getElementById("total-referred-plan3-users").innerHTML = json.activeSubscribers.plan3;
    document.getElementById("guaranteed-commission").innerHTML = (json.accumulatedThisPeriod.plan1 * json.commissions.plan1) + (json.accumulatedThisPeriod.plan2 * json.commissions.plan2) + (json.accumulatedThisPeriod.plan3 * json.commissions.plan3);;
    document.getElementById("projected-commission").innerHTML = (json.activeSubscribers.plan1 * json.commissions.plan1) + (json.activeSubscribers.plan2 * json.commissions.plan2) + (json.activeSubscribers.plan3 * json.commissions.plan3);
}

async function billingInfo() {
    let response = await fetch(`/${PREFIX}/billing-info`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials})
    });

    let info = await response.json();

    document.getElementById("credit-spend").innerHTML = info.creditSpend;
    document.getElementById("renew-date").innerHTML = new Date(info.renewDate * 1000).toLocaleString()
}

async function generateInvoice(account) {
    let response = await fetch(`/${PREFIX}/generate-invoice`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials, account})
    });

    let result = await response.json();
    console.log(result);

    populateAccounts();

    alert(`Invoice '${result.invoiceId}' ($${result.subtotalUSD}) created and emailed to ${result.billingEmail}`);

    //TODO: show modal with link to invoice
    // window.open(`https://dashboard.stripe.com/invoices/${result.invoiceId}`)
}

async function populateAccounts() {
    let response = await fetch(`/${PREFIX}/get-accounts`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials})
    });

    let result = await response.json();
    const table = document.getElementById("account-table-body");
    table.innerHTML = "";

    for (const account of result.accounts) {
        table.innerHTML += `<tr data-account-name="${account.name}">
            <td>${account.name}</td>
            <td>${account.billingEmail}</td>
            <td>${account.subscriptionStatus}</td>
            <td>${account.minSpendUSD ? account.minSpendUSD : "n/a"}</td>
            <td>${account.minSpendPerSeatUSD ? account.minSpendPerSeatUSD : "n/a"}</td>
            <!--  <td>0</td>  -->
            <!--  <td>0</td>  -->
            <td>${new Date(account.renewDate * 1000).toLocaleDateString()}</td>
            <td><a href="https://dashboard.stripe.com/customers/${account.customerId}">Stripe</a></td>
            <td>${account.invoices.length > 1 ? `<a href="https://dashboard.stripe.com/invoices/${account.invoices[account.invoices.length - 2]}">Previous</a>` : ""}</td>
            <td>${account.invoices.length > 0 ? `<a href="https://dashboard.stripe.com/invoices/${account.invoices[account.invoices.length - 1]}">Latest</a>` : ""}</td>
            <td>${account.subscriptionStatus == "active" ? `<i onclick="cancelAccount('${account.name}')" class="fa-solid fa-xmark"></i>` : `<i onclick="activateAccount('${account.name}')" class="fa-solid fa-check"></i>`}</td>
            <td><i onclick="generateInvoice('${account.name}')" class="fa-solid fa-file-invoice-dollar"></i></td>
            <td><i onclick="deleteAccount('${account.name}')" class="fa-solid fa-trash"></i></td>
        </tr>`
    }
}

async function cancelAccount(accountName) {
    await fetch(`/${PREFIX}/cancel-account`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials, accountName})
    });

    populateAccounts();
}

async function activateAccount(accountName) {
    await fetch(`/${PREFIX}/activate-account`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials, accountName})
    });

    populateAccounts();
}

async function deleteAccount(accountName) {
    if (confirm(`Are you sure you want to PERMANENTLY delete account ${accountName}?`) && confirm(`FINAL WARNING: This will DELETE the account and ALL associated users - are you sure?`)) {
        await fetch(`/${PREFIX}/delete-account`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({credentials, accountName})
        });

        populateAccounts();
    }
}

function searchAccounts() {
    // Declare variables
    var input, filter, table, tr, i, txtValue;
    input = document.getElementById("account-search");
    filter = input.value.toUpperCase();
    table = document.getElementById("account-table");
    tr = table.getElementsByTagName("tr");

    // Loop through all table rows, and hide those who don't match the search query
    for (i = 0; i < tr.length; i++) {
        const name = tr[i].getElementsByTagName("td")[0];
        const email = tr[i].getElementsByTagName("td")[1];

        if (name && email) {
            nameValue = name.textContent || name.innerText;
            emailValue = email.textContent || email.innerText;

            if (nameValue.toUpperCase().indexOf(filter) > -1 || emailValue.toUpperCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
}