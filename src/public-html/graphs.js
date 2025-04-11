async function initGraphs() {
    if (privilege == "admin") {
        try {
            metrics = await getMetrics();
            drawGraphs();
        } catch(err) {
            console.log(err);
        }
    } else {
        window.location = LOG_OUT_URL;
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