require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const imagesRouter = require('./routes/images.routes');
const templatesRouter = require('./routes/templates.routes');
const subjectsRouter = require('./routes/subjects.routes');
const authRouter = require('./routes/auth.routes');
const usersRouter = require('./routes/users.routes');
const examsRouter = require('./routes/exams.routes');
const homeworkRouter = require('./routes/homework.routes');
const classroomRouter = require('./routes/classroom.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if not exists
const uploadDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads/images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Static files - serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files (production)
const frontendPath = path.join(__dirname, 'build');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  console.log('📱 Serving frontend from:', frontendPath);
}

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/images', imagesRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api/exams', examsRouter);
app.use('/api/homework', homeworkRouter);
app.use('/api/classrooms', classroomRouter);

// Health check
app.get('/api/health', (req, res) => {
  const useMock = process.env.USE_MOCK === 'true';
  const provider = process.env.IMAGE_PROVIDER || (useMock ? 'mock' : 'huggingface');
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    provider: provider,
    mockMode: useMock
  });
});

// Serve frontend for all non-API routes (SPA support)
if (fs.existsSync(frontendPath)) {
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});


app.listen(PORT, () => {
  const useMock = process.env.USE_MOCK === 'true';
  const provider = process.env.IMAGE_PROVIDER || (useMock ? 'mock' : 'huggingface');

  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🎨 Image Provider: ${provider.toUpperCase()}`);
  if (useMock) console.log(`⚠️ Legacy Mock Mode is ENABLED (overrides provider settings if not handled)`);
  console.log(`📁 Upload directory: ${uploadDir}`);
});
