import { Pool } from 'pg';

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
};

let pool;
let dbInitialized = false;

const initializeDatabase = async () => {
  if (dbInitialized) return true;
  
  try {
    pool = new Pool(poolConfig);
    const client = await pool.connect();
    
    // Verificar y modificar la tabla para incluir country_code si no existe
    const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clicks'
    `);
    
    const hasCountryCode = columns.rows.some(row => row.column_name === 'country_code');
    
    if (!hasCountryCode) {
      await client.query('ALTER TABLE clicks ADD COLUMN country_code TEXT');
      console.log('✅ Added country_code column');
    }
    
    client.release();
    dbInitialized = true;
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
};

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Solo un mapeo mínimo en la API (para casos donde no se envía country_code)
const getCountryCode = (countryName, providedCode = null) => {
  if (providedCode) return providedCode.toLowerCase();
  
  // Mapeo mínimo para casos de emergencia
  const emergencyMap = {
    'United States': 'us', 'United States of America': 'us',
    'United Kingdom': 'gb', 'Great Britain': 'gb',
    'South Korea': 'kr', 'Russia': 'ru', 'China': 'cn',
    'Germany': 'de', 'France': 'fr', 'Japan': 'jp',
    'Brazil': 'br', 'India': 'in', 'Italy': 'it',
    'Spain': 'es', 'Canada': 'ca', 'Australia': 'au'
  };
  
  return emergencyMap[countryName] || 'un';
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  const path = event.path.replace('/api/', '');
  
  try {
    if (path === 'health' && event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'OK',
          timestamp: new Date().toISOString(),
          message: 'PopCat API is running smoothly'
        })
      };
    }
    
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
    
    if (path === 'click' && event.httpMethod === 'POST') {
      const { country, country_code } = JSON.parse(event.body);
      
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
      
      const finalCountryCode = getCountryCode(country, country_code);
      
      const updateResult = await pool.query(
        `INSERT INTO clicks (country, total_clicks, country_code)
         VALUES ($1, 1, $2)
         ON CONFLICT (country) 
         DO UPDATE SET 
           total_clicks = clicks.total_clicks + 1,
           country_code = COALESCE($2, clicks.country_code)
         RETURNING total_clicks`,
        [country, finalCountryCode]
      );
      
      const leaderboardResult = await pool.query(
        "SELECT country, total_clicks, country_code FROM clicks ORDER BY total_clicks DESC LIMIT 20"
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
    
    if (path === 'leaderboard' && event.httpMethod === 'GET') {
      const result = await pool.query(
        "SELECT country, total_clicks, country_code FROM clicks ORDER BY total_clicks DESC LIMIT 20"
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
    
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ 
        error: 'Endpoint not found',
        available_endpoints: ['/health', '/click', '/leaderboard']
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
