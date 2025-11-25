// PostgreSQL Database Configuration
const dbConfig = {
  //host: '192.168.5.220',
  host: 'localhost',
  port: 5432,
  database: 'laktat',
  //user: 'arieger',
  user: 'postgres',
  password: 'LisgumuM20251!',
  
  // Connection pool settings
  pool: {
    min: 2,
    max: 10,
    acquire: 30000,
    idle: 10000
  },
  
  // SSL settings (adjust as needed)
  ssl: false,
  
  // Timezone
  timezone: '+01:00'
};

module.exports = dbConfig;