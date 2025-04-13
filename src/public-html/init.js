//2025 Munro Research Limited, All rights reserved

const PREFIX = "portal"
const LOG_OUT_URL = "/portal/";
const ANYMODEL_BASE_URL = "http://localhost:5500";

var credentials = null;
var privilege = null;
var id = null;
var accountName = null;

async function init() {
    let item = localStorage.getItem('credentials');
    if (item) {
        let loadedCredentials = JSON.parse(item);
        await processLogin(loadedCredentials.email, loadedCredentials.password);
    }
}

async function postLogin() {
    if (window.location.toString().endsWith(LOG_OUT_URL) || window.location.toString().includes("index.html")) {
        initIndex();
        return;
    } 

    if (window.location.toString().includes("graphs.html")) {
        initGraphs();
        return;
    } 

    if (window.location.toString().includes("affiliate.html")) {
        initAffiliates();
        return;
    } 

    if (window.location.toString().includes("account.html")) {
        initAccount();
        return;
    } 

    if (window.location.toString().includes("user.html")) {
        initUser();
        return;
    } 
}

async function logout() {
    localStorage.removeItem('credentials');
    window.location = LOG_OUT_URL;
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
        accountName = json.account;
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