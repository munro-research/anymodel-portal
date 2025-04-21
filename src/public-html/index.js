//2025 Munro Research Limited, All rights reserved

async function initIndex() {
    if (privilege == "admin") {
        for (const elem of document.getElementsByClassName("admin")) {
            elem.style.display = "block";
        }

        //Too many users, displaying them all slows down the browser
        //TODO: paginate users
        document.getElementById("users").style.display = "none";

        populateAccounts();
    } else if (privilege == "org-admin") {
        for (const elem of document.getElementsByClassName("org-admin")) {
            elem.style.display = "block";
        }

        document.querySelectorAll(".admin-table").forEach(e => e.remove());

        document.getElementById("plans").innerHTML = `<option value="sub-account" selected>Sub account</option>`
        document.getElementById("plan-selection").style.display = "none";

        const org = document.getElementById("new-account");
        org.readOnly = true;
        org.value = accountName;

        document.getElementById("new-privilege").style.display = "none";
        
        await populateUsage(accountName);
        document.getElementById("view-account-link").href = `/${PREFIX}/account.html?name=${accountName}`;

        await populateUsers();
    }
}

async function populateUsers() {
    let response = await fetch(`/${PREFIX}/get-users`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials})
    });

    let result = await response.json();
    const table = document.getElementById("user-table-body");
    table.innerHTML = "";

    for (const user of result.users) {
        let rows = "";

        rows += `<td><a href="/${PREFIX}/user.html?email=${user.email}">${user.username}</a></td>
            <td>${user.email}</td>`

        if (privilege == "admin") rows += `<td>${user.account ? `<a href="/${PREFIX}/account.html?name=${user.account}">${user.account}</a>` : "n/a"}</td>`;

        rows += `<td>${new Date(user.signUpDate).toLocaleDateString()}</td>
            <td>${new Date(user.lastUsed).toLocaleDateString()}</td>
            <td>${user.privilege ? user.privilege : "n/a"}</td>
            <td>${user.banned === true ? "YES" : "NO"}</td>`

        if (privilege == "admin") {
            rows += `<td>${user.emailConsent}</td>
                <td>${user.analyticsConsent}</td>
                <td>${user.plan}</td>
                <td>${user.subscriptionStatus}</td>
                <td>${new Date(user.renewDate * 1000).toLocaleDateString()}</td>
                <td>${user.paymentService == "Stripe" ? `<a href="https://dashboard.stripe.com/customers/${user.customerId}">Stripe</a>` : user.paymentService}</td>`;
        }

        rows += `<td>${user.credits}</td>
            <td>${user.banned ? `<i onclick="unbanUser('${user.email}')" class="fa-solid fa-user-check ui-icon"></i>` : `<i onclick="banUser('${user.email}')" class="fa-solid fa-ban ui-icon"></i>`}</td>
            <td><i onclick="deleteUser('${user.email}')" class="fa-solid fa-trash ui-icon"></i></td>`;

        table.innerHTML += `<tr data-account-email="${user.email}">${rows}</tr>`;
    }
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
            <td><a href="/${PREFIX}/account.html?name=${account.name}">${account.name}</a></td>
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
            <td>${account.subscriptionStatus == "active" ? `<i onclick="cancelAccount('${account.name}')" class="fa-solid fa-xmark ui-icon"></i>` : `<i onclick="activateAccount('${account.name}')" class="fa-solid fa-check ui-icon"></i>`}</td>
            <td><i onclick="generateInvoice('${account.name}')" class="fa-solid fa-file-invoice-dollar ui-icon"></i></td>
            <td><i onclick="deleteAccount('${account.name}')" class="fa-solid fa-trash ui-icon"></i></td>
        </tr>`
    }
}

async function createUser() {
    let email = document.getElementById("new-email").value;
    let password = document.getElementById("new-password").value;
    let plan = document.getElementById("plans").value; 
    let changePassword = document.getElementById("change-password").checked;

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
        body: JSON.stringify({credentials, newUser: {email, password, plan, changePassword, account, privilege: privilegeLevel}})
    });

    if (response.status == 200) {
        alert(`User '${email}' created`);
        populateUsers();
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
            populateUsers();
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
        populateUsers();
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
        populateUsers();
    } else {
        let json = await response.json();
        alert(json.error);
    }
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

function searchTwoColumns(inputId, tableId) {
    const input = document.getElementById(inputId);
    const filter = input.value.toUpperCase();
    const table = document.getElementById(tableId);
    const tr = table.getElementsByTagName("tr");

    // Loop through all table rows, and hide those who don't match the search query
    for (let i = 0; i < tr.length; i++) {
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