const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');

// Load environment variables from .env
dotenv.config();

const { authLimiter, apiLimiter } = require('./src/middleware/rateLimit');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');

const app = express();

// When deployed behind a proxy (Render, Railway...), uncomment so rate limits use real IPs
// app.set('trust proxy', 1);

// CSP is off for now: the frontend uses inline scripts/handlers and CDN assets
app.use(helmet({ contentSecurityPolicy: false }));

// Only needed if the frontend is hosted on a different origin
app.use(
  cors({
    origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : false,
    credentials: true,
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limits
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// API routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/users', require('./src/routes/user.routes'));
app.use('/api/uploads', require('./src/routes/upload.routes'));
app.use('/api/posts', require('./src/routes/post.routes'));
app.use('/api', require('./src/routes/comment.routes'));

// Serve the frontend (must come after the API routes)
app.use(express.static(path.join(__dirname, 'client')));

// Must come after everything else
app.use(notFound);
app.use(errorHandler);

// Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => console.error('❌ Database connection error:', err));

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});