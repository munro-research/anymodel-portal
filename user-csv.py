import requests

CSV_FILE = "./guests.csv"
HEADINGS = True
DELIM = ","
PORTAL_API = "https://app.anymodel.xyz/portal"
CREDENTIALS = {
    "email": "jamie@munro-research.com",
    "password":"GreenBudweiser!12",
}

with open(CSV_FILE, 'r') as file:
    counter = 0

    # Read each line in the file
    for line in file:
        counter += 1
        
        if counter == 1 and HEADINGS:
            continue

        # Print each line
        components = line.strip().split(DELIM)

        email = components[0]
        password = components[1]

        newUser = {
            "email": email,
            "password": password,
            "plan": "plan2-extended-trial",
            "changePassword": False,
            "account": None,
            "privilege": None,
        }

        r = requests.post(PORTAL_API+"/create-user", json={"credentials": CREDENTIALS, "newUser": newUser})
        print("Creating " + email + ": " + str(r.status_code))
