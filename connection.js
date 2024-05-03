
const { Client } = require('pg');


const client = new Client({
    user: 'postgres',
    host: 'db',
    password: 'postgres'
});




(async () => {
    try {
        await client.connect();
        console.log("Connected to PostgreSQL server");
    } catch (error) {
        console.error("Failed to connnect to PostgreSQL server:");
        
        
    }
})();


module.exports = client;

    
