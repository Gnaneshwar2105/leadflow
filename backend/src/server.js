require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
 
const authRoutes = require('./routes/authRoutes');
const leadRoutes = require('./routes/leadRoutes');
const publicRoutes = require('./routes/publicRoutes');
 
const app = express();
 
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
 
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'leadflow-api' }));
 
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/public', publicRoutes);
 
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);
 
const PORT = process.env.PORT || 4000;
 
// Connect on import so serverless platforms (which require() this file
// instead of running it directly) still get a database connection.
// Mongoose queues operations until the connection is ready, so this is
// safe even if a request comes in before the promise resolves.
connectDB(process.env.MONGO_URI).catch((err) => {
  console.error('[db] connection failed', err);
});
 
if (require.main === module) {
  app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
}
 
module.exports = app;
 