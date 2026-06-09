const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.query('SELECT 1').then(() => {
  console.log('✅ متصل بقاعدة البيانات');
}).catch(e => {
  console.error('❌ فشل الاتصال بقاعدة البيانات:', e.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
