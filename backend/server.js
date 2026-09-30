require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/db');
const { streamFileFromGridFs } = require('./services/fileStorage');

const categoryRoutes = require('./routes/categoryRoutes');
const designRoutes = require('./routes/designRoutes');
const aiRoutes = require('./routes/aiRoutes');
const orderRoutes = require('./routes/orderRoutes');
const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const customerAuthRoutes = require('./routes/customerAuthRoutes');
const templateRoutes = require('./routes/templateRoutes');
const adminTemplateRoutes = require('./routes/adminTemplateRoutes');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/api/files/:id', streamFileFromGridFs);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'YAMINI FLEX PRINTING SERVER IS WORKING' });
});

// Public routes
app.use('/api/categories', categoryRoutes);
app.use('/api/designs', designRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerAuthRoutes);
app.use('/api/templates', templateRoutes);

// Admin routes
app.use('/api/admin/auth', authRoutes);
app.use('/api/admin/templates', adminTemplateRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const isUploadError = err.name === 'MulterError' || /file type|too large/i.test(err.message || '');
  res.status(err.status || (isUploadError ? 400 : 500)).json({ success: false, message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
server.requestTimeout = 0;
server.timeout = 0;
server.listen(PORT, () => {
  console.log(`YAMINI FLEX PRINTING server running on port ${PORT}`);
});
