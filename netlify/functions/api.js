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

// Database connection with better error handling
const createPool = () => {
  try {
    console.log('🔗 Creating database pool with URL:', 
      process.env.DATABASE_URL ? 'URL present' : 'URL missing');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { 
        rejectUnauthorized: false 
      },
      // Additional connection settings for Neon
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 5
    });

    // Test connection
    pool.on('connect', () => {
      console.log('✅ Database connected successfully');
    });

    pool.on('error', (err) => {
      console.error('❌ Database connection error:', err);
    });

    return pool;
  } catch (error) {
    console.error('❌ Error creating pool:', error);
    throw error;
  }
};

let pool;

// Initialize database connection
const initializeDatabase = async () => {
  try {
    if (!pool) {
      pool = createPool();
    }

    // Test the connection
    const client = await pool.connect();
    console.log('✅ Database connection test successful');
    
    // Check if table exists, create if not
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'clicks'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('📋 Creating clicks table...');
      await client.query(`
        CREATE TABLE clicks (
          country TEXT PRIMARY KEY,
          total_clicks BIGINT DEFAULT 0
        );
      `);
      console.log('✅ Table created successfully');
    } else {
      console.log('✅ Table already exists');
    }

    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    return false;
  }
};

// Initialize on cold start
let dbInitialized = false;

const ensureDatabaseInitialized = async () => {
  if (!dbInitialized) {
    dbInitialized = await initializeDatabase();
  }
  return dbInitialized;
};

// Routes
app.post('/click', async (req, res) => {
  console.log('📥 Received click request:', req.body);
  
  const { country } = req.body;

  if (!country) {
    return res.status(400).json({ success: false, error: "Falta el país" });
  }

  try {
    // Ensure database is initialized
    const initialized = await ensureDatabaseInitialized();
    if (!initialized) {
      throw new Error('Database not initialized');
    }

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
    const initialized = await ensureDatabaseInitialized();
    if (!initialized) {
      throw new Error('Database not initialized');
    }

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
    const initialized = await ensureDatabaseInitialized();
    if (!initialized) {
      throw new Error('Database not initialized');
    }

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
    const initialized = await ensureDatabaseInitialized();
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: initialized ? 'connected' : 'disconnected',
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

// Health check endpoint for Netlify
app.get('/', (req, res) => {
  res.json({ 
    message: 'PopCat API is running',
    timestamp: new Date().toISOString()
  });
});

export const handler = serverless(app);
