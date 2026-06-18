const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const isProd = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  ...(isProd ? { ssl: { rejectUnauthorized: false } } : {}),
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
