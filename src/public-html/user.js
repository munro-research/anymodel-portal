//2025 Munro Research Limited, All rights reserved

var user = null;
var prompts = null;

async function initUser() {
    if (privilege == "admin" || privilege == "org-admin") {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const email = urlParams.get('email');

            user = await getUser(email);
            populateUser(user);

            prompts = await getUserPrompts(email);
            populatePrompts(prompts);

            if (privilege == "admin") {
                for (const elem of document.getElementsByClassName("admin")) {
                    elem.style.display = "block";
                }
            }
        } catch(err) {
            console.log(err);
        }
    } else {
        window.location = LOG_OUT_URL;
    }
}

async function getUser(userEmail) {
    let response = await fetch(`/${PREFIX}/view-user`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials, userEmail})
    });

    let json = await response.json();
    return json.user;
}

async function getUserPrompts(userEmail) {
    let response = await fetch(`/${PREFIX}/get-user-prompts`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials, userEmail})
    });

    let json = await response.json();
    return json.prompts;
}

function populateUser(user) {
    document.getElementById("user-id").innerHTML = user._id;
    document.getElementById("user-username").innerHTML = user.username;
    document.getElementById("user-email").innerHTML = user.email;
    document.getElementById("user-signup-date").innerHTML = new Date(user.signUpDate).toLocaleString();
    document.getElementById("user-last-used").innerHTML = new Date(user.lastUsed).toLocaleString();
    document.getElementById("user-privilege").innerHTML = user.privilege;
    document.getElementById("user-banned").innerHTML = user.banned;
    document.getElementById("user-payment-service").innerHTML = user.paymentService == "Stripe" ? `<a href="https://dashboard.stripe.com/customers/${user.customerId}">Stripe</a>` : user.paymentService;
    document.getElementById("user-credits").innerHTML = user.credits;

    if (privilege == "admin") {
        document.getElementById("user-plan").innerHTML = user.plan;
        document.getElementById("user-status").innerHTML = user.subscriptionStatus;
        document.getElementById("user-renew-date").innerHTML = new Date(user.renewDate * 1000).toLocaleString();
        document.getElementById("user-analytics-consent").innerHTML = user.emailConsent;
        document.getElementById("user-email-consent").innerHTML = user.analyticsConsent;

        if (["trial", "plan1", "plan2"].includes(user.plan)) {
            document.getElementById("credits-msg").innerHTML = "Credits Remaining:";
        }
    }

    if (user.quota) {
        document.getElementById("override-quota").checked = true;
        document.getElementById("user-quota").value = Number(user.quota);
    } else document.getElementById("override-quota").checked = false;

    setSafetySettingState(user.safetySettings);

    if (user.safetySettings) {
        document.getElementById("override-safety").checked = true;
    } else document.getElementById("override-safety").checked = false;

    userOverrides();
}

function populatePrompts(prompts) {
    //sort prompts
    prompts.sort((a, b) => new Date(a.date) - new Date(b.date));

    let table = "";

    for (const prompt of prompts) {
        table += `<tr>
            <td>${new Date(prompt.date).toLocaleString()}</td>
            <td>${prompt.type}</td>
            <td><a href="${ANYMODEL_BASE_URL}?view=${prompt.stateId}">${prompt.stateId}</a></td>
            <td>${prompt.prompt}</td>
        </tr>`;
    }
    
    document.getElementById("recent-prompts-body").innerHTML = table;
}

function searchPrompts() {
    const input = document.getElementById("prompt-search");
    const filter = input.value.toUpperCase();
    const table = document.getElementById("recent-prompts-table");
    const tr = table.getElementsByTagName("tr");

    // Loop through all table rows, and hide those who don't match the search query
    for (let i = 0; i < tr.length; i++) {
        const prompt = tr[i].getElementsByTagName("td")[3];

        if (prompt) {
            promptValue = prompt.textContent || prompt.innerText;

            if (promptValue.toUpperCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
}

function userOverrides() {
    if (document.getElementById("override-quota").checked) {
        document.getElementById("user-quota-settings").style.display = "block";
    } else {
        document.getElementById("user-quota-settings").style.display = "none";
    }

    if (document.getElementById("override-safety").checked) {
        document.getElementById("user-safety-settings").style.display = "block";
    } else {
        document.getElementById("user-safety-settings").style.display = "none";
    }
}

async function updateUserQuota() {
    let quota = null;
    if (document.getElementById("override-quota").checked) quota = document.getElementById("user-quota").value;

    await fetch(`/${PREFIX}/update-user-quota`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials, userEmail: user.email, quota})
    });
}

async function updateUserSafety() {
    let settings = null;
    if (document.getElementById("override-safety").checked) settings = safetySettingState();
    
    await fetch(`/${PREFIX}/update-user-safety-settings`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({credentials, userEmail: user.email, settings})
    });
}