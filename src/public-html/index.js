//2025 Munro Research Limited, All rights reserved

var credentials = null;
var privilege = null;

async function init() {
    let item = localStorage.getItem('credentials');
    if (item) {
        let loadedCredentials = JSON.parse(item);
        await processLogin(loadedCredentials.email, loadedCredentials.password);
    }
}

async function logout() {
    localStorage.removeItem('credentials');
    window.location = "/"
}

async function login() {
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    let error = await processLogin(email, password);
    if (error) {
        alert(json.error);
    }
}

async function processLogin(email, password) {
    let response = await fetch(`/login`, {
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

        document.getElementById("logged-out").style.display = "none";
        document.getElementById("logged-in").style.display = "block";
        document.getElementById("logged-in-msg").innerHTML = `Logged in as ${credentials.email} (${privilege})`;

        localStorage.setItem('credentials', JSON.stringify(credentials));

        return null;
    } else {
        localStorage.removeItem('credentials');
        return json.error;
    }
}

async function viewUser() {
    let userEmail = document.getElementById("user-email").value;

    let response = await fetch(`/view-user`, {
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

    let response = await fetch(`/delete-user`, {
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

    let response = await fetch(`/ban-user`, {
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

    let response = await fetch(`/unban-user`, {
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
    let paymentService = null;

    if (plan.endsWith("-manual")) {
        plan = plan.replaceAll("-manual", "");

        if (plan != "trial") {
            paymentService = "Manual";
        }
    } else {
        //handle setting up stripe
    }

    let response = await fetch(`/create-user`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials, newUser: {email, password, plan, changePassword, paymentService}})
    });

    if (response.status == 200) {
        alert(`User '${email}' created`);
    } else {
        let json = await response.json();
        alert(json.error);
    }
}