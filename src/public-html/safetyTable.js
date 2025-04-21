//2025 Munro Research Limited, All rights reserved
const DEFAULT_SAFETY_CONFIDENCE = 0.55

function safetySettingState() {
    let state = {};

    document.querySelectorAll(".user-safety-table tr").forEach((row) => {
        let checked =  row.querySelector('input[type="checkbox"]').checked;

        if (checked) {
            row.classList.remove("disabled");
            row.querySelector('input[type="number"]').disabled = false;

            state[row.querySelector('.attribute').textContent] = row.querySelector('input[type="number"]').value;
        } else {
            row.classList.add("disabled");
            row.querySelector('input[type="number"]').disabled = true;
        }
    })

    return state;
}

function setSafetySettingState(state) {
    if (state == null) state = {};

    document.querySelectorAll(".user-safety-table tr").forEach((row) => {
        let confidence = state[row.querySelector('.attribute').textContent];

        if (confidence) {
            row.classList.remove("disabled");
            row.querySelector('input[type="number"]').disabled = false;
            row.querySelector('input[type="checkbox"]').checked = true;
            row.querySelector('input[type="number"]').value = confidence;
        } else {
            row.classList.add("disabled");
            row.querySelector('input[type="number"]').disabled = true;
            row.querySelector('input[type="checkbox"]').checked = false;
            row.querySelector('input[type="number"]').value = DEFAULT_SAFETY_CONFIDENCE;
        }
    })
}