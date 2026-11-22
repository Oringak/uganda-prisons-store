require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { initDb } = require('./db');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const customerRoutes = require('./routes/customer');
const { UPLOADS_ROOT } = require('./services/storage');

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads & public assets
app.use('/uploads', express.static(UPLOADS_ROOT));
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api', publicRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/admin', adminRoutes);

// Serve built React frontend in production (and locally after vite build)
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

async function start() {
  try {
    await initDb();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`========================================================`);
      console.log(`  Uganda Prisons Service Products Store`);
      console.log(`  Storefront:   http://localhost:${PORT}`);
      console.log(`  Admin Portal: http://localhost:${PORT}/admin`);
      console.log(`========================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
