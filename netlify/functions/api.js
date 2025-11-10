import express from 'express';
import pg from 'pg';
import cors from 'cors';
import serverless from 'serverless-http';

const { Pool } = pg;

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Initialize database
async function initializeDatabase() {
  try {
    const tableCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clicks'
    `);
    
    const existingColumns = tableCheck.rows.map(row => row.column_name);
    
    if (existingColumns.length === 0) {
      await pool.query(`
        CREATE TABLE clicks (
          country TEXT PRIMARY KEY,
          total_clicks BIGINT DEFAULT 0
        );
      `);
      console.log('✅ Table created successfully');
    }
    
    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('❌ Database initialization error:', err);
    
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS clicks (
          country TEXT PRIMARY KEY,
          total_clicks BIGINT DEFAULT 0
        );
      `);
      console.log('✅ Fallback table creation successful');
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
    }
  }
}

// Routes
app.post('/click', async (req, res) => {
  console.log('📥 Received click request:', req.body);
  
  const { country } = req.body;

  if (!country) {
    return res.status(400).json({ success: false, error: "Falta el país" });
  }

  try {
    const updateResult = await pool.query(
      `INSERT INTO clicks (country, total_clicks)
       VALUES ($1, 1)
       ON CONFLICT (country) 
       DO UPDATE SET total_clicks = clicks.total_clicks + 1
       RETURNING total_clicks`,
      [country]
    );

    console.log('✅ Click added for country:', country);

    const result = await pool.query(
      "SELECT country, total_clicks FROM clicks ORDER BY total_clicks DESC LIMIT 20"
    );

    res.status(200).json({
      success: true,
      leaderboard: result.rows,
      country: country,
      newCount: updateResult.rows[0]?.total_clicks
    });
    
  } catch (err) {
    console.error("❌ Error al sumar click:", err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message
    });
  }
});

app.get('/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT country, total_clicks FROM clicks ORDER BY total_clicks DESC LIMIT 20"
    );
    
    res.status(200).json({
      success: true,
      leaderboard: result.rows,
    });
  } catch (err) {
    console.error("❌ Error al obtener leaderboard:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    const tableCheck = await pool.query("SELECT COUNT(*) as count FROM clicks");
    const sampleData = await pool.query("SELECT * FROM clicks ORDER BY total_clicks DESC LIMIT 5");
    
    res.status(200).json({
      success: true,
      message: "Conexión a la base de datos exitosa",
      timestamp: result.rows[0].now,
      total_countries: tableCheck.rows[0].count,
      sample_data: sampleData.rows
    });
  } catch (err) {
    console.error("❌ Error al conectar con la base de datos:", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.get('/health', async (req, res) => {
  try {
    const dbCheck = await pool.query('SELECT 1');
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      database: 'disconnected',
      error: err.message
    });
  }
});

// Initialize database when function loads
initializeDatabase();

export const handler = serverless(app);
