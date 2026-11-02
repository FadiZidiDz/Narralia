// Load .env before any other imports read process.env (Cloudinary, DB, etc.)
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import connectDB from './src/config/db.js';

// Routes
import authRoutes from './src/routes/auth.routes.js';
import storyRoutes from './src/routes/story.routes.js';
import aiRoutes from './src/routes/ai.routes.js';
import submissionRoutes from './src/routes/submission.routes.js';
import illustrationRoutes from './src/routes/illustration.routes.js';

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/illustrations', illustrationRoutes);

// Root
app.get('/', (req, res) => {
  res.json({ message: 'Narralia backend is running' });
});

// Error handling
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Narralia backend running on port ${PORT}`);
});
