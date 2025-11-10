import { Pool } from 'pg';

// Configuración de la base de datos
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
};

let pool;
let dbInitialized = false;

const initializeDatabase = async () => {
  if (dbInitialized) return true;
  
  try {
    console.log('🔗 Initializing database connection...');
    pool = new Pool(poolConfig);
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // Check and create table if needed
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'clicks'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('📋 Creating clicks table...');
      await client.query(`
        CREATE TABLE clicks (
          country TEXT PRIMARY KEY,
          total_clicks BIGINT DEFAULT 0
        );
      `);
      console.log('✅ Table created successfully');
    }
    
    client.release();
    dbInitialized = true;
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
};

// Headers comunes
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler = async (event) => {
  console.log('📥 API Request:', event.httpMethod, event.path);
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  const path = event.path.replace('/api/', '');
  
  try {
    // Health check - no necesita DB
    if (path === 'health' && event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'OK',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development'
        })
      };
    }
    
    // Para otras rutas, inicializar DB
    const dbReady = await initializeDatabase();
    if (!dbReady) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Database not available'
        })
      };
    }
    
    // Click endpoint
    if (path === 'click' && event.httpMethod === 'POST') {
      const { country } = JSON.parse(event.body);
      
      if (!country) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: "Country is required" 
          })
        };
      }
      
      const updateResult = await pool.query(
        `INSERT INTO clicks (country, total_clicks)
         VALUES ($1, 1)
         ON CONFLICT (country) 
         DO UPDATE SET total_clicks = clicks.total_clicks + 1
         RETURNING total_clicks`,
        [country]
      );
      
      const leaderboardResult = await pool.query(
        "SELECT country, total_clicks FROM clicks ORDER BY total_clicks DESC LIMIT 20"
      );
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          leaderboard: leaderboardResult.rows,
          country: country,
          newCount: updateResult.rows[0]?.total_clicks
        })
      };
    }
    
    // Leaderboard endpoint
    if (path === 'leaderboard' && event.httpMethod === 'GET') {
      const result = await pool.query(
        "SELECT country, total_clicks FROM clicks ORDER BY total_clicks DESC LIMIT 20"
      );
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          leaderboard: result.rows,
        })
      };
    }
    
    // Test DB endpoint
    if (path === 'test-db' && event.httpMethod === 'GET') {
      const now = await pool.query("SELECT NOW()");
      const count = await pool.query("SELECT COUNT(*) as count FROM clicks");
      const sample = await pool.query("SELECT * FROM clicks ORDER BY total_clicks DESC LIMIT 5");
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "Database connection successful",
          timestamp: now.rows[0].now,
          total_countries: count.rows[0].count,
          sample_data: sample.rows
        })
      };
    }
    
    // Ruta no encontrada
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ 
        error: 'Endpoint not found',
        path: path,
        method: event.httpMethod
      })
    };
    
  } catch (error) {
    console.error('❌ API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error.message 
      })
    };
  }
};
