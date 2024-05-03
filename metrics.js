const client = require("prom-client");
const counter = new client.Counter({
    name: 'api_calls_counter',
    help: 'counts the number of api calls',
    labelNames: ['api', 'statusCode', 'response_size', 'request_size', 'response_time'],
});

const gauge = new client.Gauge({
    name: 'response_time',
    help: 'stores the response time of api',
    labelNames: ['api', 'statusCode', 'response_size', 'request_size'],
});



module.exports = {counter, gauge , client};