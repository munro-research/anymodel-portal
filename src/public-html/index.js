//2025 Munro Research Limited, All rights reserved

var credentials = null;
var privilege = null;

async function login() {
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

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
    } else {
        alert(json.error);
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