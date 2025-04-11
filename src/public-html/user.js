//2025 Munro Research Limited, All rights reserved

var user = null;

async function initUser() {
    if (privilege == "admin" || privilege == "org-admin") {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const email = urlParams.get('email');
            user = await getUser(email);
            console.log(user);

            populateUser(user);

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
}