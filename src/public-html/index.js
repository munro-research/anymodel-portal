//2025 Munro Research Limited, All rights reserved

async function initIndex() {
    if (privilege == "admin") {
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
}

async function deleteUser(userEmail) {
    if (confirm(`Are you sure you want to PERMANENTLY delete user ${userEmail}?`) && confirm(`FINAL WARNING: This will DELETE ${userEmail} - are you sure?`)) {
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
}

async function banUser(userEmail) {
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

async function unbanUser(userEmail) {
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