require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const rankTypesRoutes = require('./routes/rankTypes');
const ranksRoutes = require('./routes/ranks');
const weaponsRoutes = require('./routes/weapons');
const specialtiesRoutes = require('./routes/specialties');
const soldiersRoutes = require('./routes/soldiers');
const examsRoutes = require('./routes/exams');
const resultsRoutes = require('./routes/results');
const fitnessRoutes = require('./routes/fitness');
const announcementsRoutes = require('./routes/announcements');
const usersRoutes = require('./routes/users');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(helmet());
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/rank-types', rankTypesRoutes);
app.use('/api/ranks', ranksRoutes);
app.use('/api/weapons', weaponsRoutes);
app.use('/api/specialties', specialtiesRoutes);
app.use('/api/soldiers', soldiersRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/fitness', fitnessRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/ai', aiRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'حدث خطأ غير متوقع' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Battalion20 API running on http://localhost:${PORT}`);
    console.log(`🌐 Accepting requests from: ${FRONTEND_URL}`);
  });
}

module.exports = app;
