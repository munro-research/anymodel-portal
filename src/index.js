//2024 Munro Research, All Rights Reserved

const express = require('express');
const compression = require('compression')
const bodyParser = require("body-parser");
require("dotenv").config(); 

const log = require("./log.js");

var app = express();

//response body compression
app.use(compression())

//json middleware
app.use(bodyParser.json({limit: process.env.MAX_PAYLOAD_BYTES}));

//respond to healthcheck
app.get('/', (req, res) => {
    res.status(200).send();
});
  
app.listen(process.env.PORT, () => {
    log.info(`Listening on port ${process.env.PORT}`);
});