//2025 Munro Research Limited, All rights reserved

const express = require('express');
const compression = require('compression')
const bodyParser = require("body-parser");
require("dotenv").config(); 

const log = require("./log.js");
const router = require("./router.js");

var app = express();

//response body compression
app.use(compression())

app.use(process.env.PREFIX, express.static('public-html'));

//json middleware
app.use(bodyParser.json({limit: process.env.MAX_PAYLOAD_BYTES}));

//respond to healthcheck
app.get('/', (req, res) => {
    res.status(200).send();
});

app.use(process.env.PREFIX, router);
  
app.listen(process.env.PORT, () => {
    log.info(`Listening on port ${process.env.PORT}`);
});