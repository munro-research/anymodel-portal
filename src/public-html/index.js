//2025 Munro Research Limited, All rights reserved

const PREFIX = "portal"

var credentials = null;
var privilege = null;
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
        drawGraphs();

        for (const elem of document.getElementsByClassName("admin")) {
            elem.style.display = "block";
        }
    } else if (privilege == "org-admin") {
        for (const elem of document.getElementsByClassName("org-admin")) {
            elem.style.display = "block";
        }
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
    let paymentService = null;

    let account = document.getElementById("new-account").value;
    if (account == "") account = null;
    
    let privilegeLevel = document.getElementById("new-privilege").value;
    if (privilegeLevel == "null") privilegeLevel = null;

    if (plan.endsWith("-manual")) {
        plan = plan.replaceAll("-manual", "");

        if (plan != "trial") {
            paymentService = "Manual";
        }
    } else {
        //handle setting up stripe
    }

    let response = await fetch(`/${PREFIX}/create-user`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials, newUser: {email, password, plan, changePassword, paymentService, account, privilege: privilegeLevel}})
    });

    if (response.status == 200) {
        alert(`User '${email}' created`);
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

function drawGraphs() {
    weeklyUsers();
    weeklyQueries();
    weeklyPlans();
}

function isMonday(time) {
    let date = new Date(time);
    return date.getDay() == 1;
}

function weeklyUsers() {

    const ctx = document.getElementById('weekly-users-graph-canvas');

    let labels = [];
    let data1 = [];
    let data2 = [];

    let i = 0;
    while(!isMonday(metrics[i].time)) {
        i++;
    }

    for (; i < metrics.length; i += 7) {
        let item = metrics[i];

        labels.push(`w/c ${new Date(item.time).toDateString()}`);
        data1.push(item.active_users_last_7_days)
        data2.push(item.sign_ups_last_7_days)
    }

    new Chart(ctx, {
    type: 'line',
    data: {
        labels: labels,
        datasets: [
            {
                label: '# of active users',
                data: data1,
                borderWidth: 1
            },
            {
                label: '# of sign ups',
                data: data2,
                borderWidth: 1
            }
        ]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
    });
}

function weeklyQueries() {

    const ctx = document.getElementById('weekly-queries-graph-canvas');

    let labels = [];
    let data1 = [];
    let data2 = [];

    let i = 0;
    while(!isMonday(metrics[i].time)) {
        i++;
    }

    for (; i < metrics.length; i += 7) {
        let item = metrics[i];
        
        let date = new Date(item.time);

        labels.push(`w/c ${date.toDateString()}`);
        data1.push(item.text_queries_last_7_days)
        data2.push(item.image_queries_last_7_days)
    }

    new Chart(ctx, {
    type: 'bar',
    data: {
        labels: labels,
        datasets: [
            {
                label: '# of text queries',
                data: data1,
                borderWidth: 1
            },
            {
                label: '# of image queries',
                data: data2,
                borderWidth: 1
            }
        ]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
    });
}

function weeklyPlans() {

    const ctx = document.getElementById('weekly-plans-graph-canvas');

    let labels = [];
    let data1 = [];
    let data2 = [];

    let i = 0;
    while(!isMonday(metrics[i].time)) {
        i++;
    }

    for (; i < metrics.length; i += 7) {
        let item = metrics[i];

        labels.push(`w/c ${new Date(item.time).toDateString()}`);
        data1.push(item.number_of_active_starter_plans)
        data2.push(item.number_of_active_plus_plans)
    }

    new Chart(ctx, {
    type: 'line',
    data: {
        labels: labels,
        datasets: [
            {
                label: '# of starter plans',
                data: data1,
                borderWidth: 1
            },
            {
                label: '# of plus plans',
                data: data2,
                borderWidth: 1
            }
        ]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
    });
}