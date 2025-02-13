//2024 Munro Research Limited, All rights reserved

const winston = require('winston');
const { combine, timestamp, json, errors } = winston.format;

const log = winston.createLogger({
  level: "debug",
  format: combine(errors({ stack: true }), timestamp(), json()),

  transports: [new winston.transports.Console()],
});

module.exports = log;