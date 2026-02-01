const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Enable CORS with explicit configuration
app.use(cors({
  origin: '*', // Allow all origins (for development)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Add logging middleware to see incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

app.use(express.json());

// PostgreSQL config (same as your MQTT server)
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'iot_data',
  password: '12345678',
  port: 5432,
});

// Test database connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected at:', res.rows[0].now);
  }
});

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /devices
 * List distinct device names based on topic:
 *   '/device1/temperature' -> 'device1'
 *   '/device2/status'      -> 'device2'
 */
app.get('/devices', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT
        split_part(ltrim(topic, '/'), '/', 1) AS device_name
      FROM mqtt_messages
      WHERE topic LIKE '/device%/%'
      ORDER BY device_name;
    `;

    const result = await pool.query(query);
    console.log(`✅ Found ${result.rowCount} devices`);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching devices:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

/**
 * GET /devices/:deviceName/data
 * Get data for a specific device (all topics that start with /deviceName/)
 * Example:
 *     /devices/device1/data
 * Optional query:
 *     ?limit=100
 */
app.get('/devices/:deviceName/data', async (req, res) => {
  const { deviceName } = req.params;
  const limit = parseInt(req.query.limit, 10) || 50;

  try {
    const topicPrefix = `/${deviceName}/%`;

    const query = `
      SELECT 
        topic, 
        payload_raw, 
        payload_json, 
        created_at AS timestamp
      FROM mqtt_messages
      WHERE topic LIKE $1
      ORDER BY created_at DESC
      LIMIT $2;
    `;

    const result = await pool.query(query, [topicPrefix, limit]);

    console.log(`✅ Found ${result.rowCount} records for device: ${deviceName}`);
    if (result.rows.length > 0) {
      console.log('Sample row:', result.rows[0]);
    }

    res.json({
      device: deviceName,
      count: result.rowCount,
      data: result.rows,
    });
  } catch (err) {
    console.error('❌ Error fetching device data:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

/**
 * GET /devices/:deviceName/latest
 * Get the latest row for that device.
 */
app.get('/devices/:deviceName/latest', async (req, res) => {
  const { deviceName } = req.params;

  try {
    const topicPrefix = `/${deviceName}/%`;

    const query = `
      SELECT topic, payload_raw, payload_json, created_at AS timestamp
      FROM mqtt_messages
      WHERE topic LIKE $1
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const result = await pool.query(query, [topicPrefix]);

    if (result.rowCount === 0) {
      console.log(`⚠️ No data found for device: ${deviceName}`);
      return res.status(404).json({ error: 'No data found for this device' });
    }

    console.log(`✅ Latest data for device: ${deviceName}`);
    res.json({
      device: deviceName,
      data: result.rows[0],
    });
  } catch (err) {
    console.error('❌ Error fetching latest device data:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HTTP API server listening on port ${PORT}`);
  console.log(`📡 Access via: http://localhost:${PORT}`);
  console.log(`🌐 Network access: http://10.1.73.72:${PORT}`);
});