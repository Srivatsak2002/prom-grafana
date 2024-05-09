const client = require("prom-client");

const apiCallsCounter = new client.Counter({
    name: 'api_calls_total',
    help: 'Total number of API calls',
    labelNames: ['api', 'statusCode'],
});

const responseTimeGauge = new client.Gauge({
    name: 'response_time_seconds',
    help: 'Response time of API calls',
    labelNames: ['api', 'statusCode'],
});

const requestSizeGauge = new client.Gauge({
    name: 'request_size_bytes',
    help: 'Request size of API calls',
    labelNames: ['api', 'statusCode'],
});

const responseSizeGauge = new client.Gauge({
    name: 'response_size_bytes',
    help: 'Response size of API calls',
    labelNames: ['api', 'statusCode'],
});

module.exports = { apiCallsCounter, responseTimeGauge, requestSizeGauge, responseSizeGauge, client };
