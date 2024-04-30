
const { Client } = require('pg');

// Create a new client instance
const client = new Client({
    user: 'postgres',
    host: 'db',
    password: 'postgres'
});



// Attempt to connect to the PostgreSQL server
(async () => {
    try {
        await client.connect();
        console.log("Connected to PostgreSQL server");
    } catch (error) {
        console.error("Failed to connnect to PostgreSQL server:");
        
        // Optionally, handle the error here
    }
})();

// Export the client for use in other modules
module.exports = client;

    
