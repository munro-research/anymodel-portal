//2025 Munro Research Limited, All rights reserved

async function initAffiliates() {
    await affiliates();
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