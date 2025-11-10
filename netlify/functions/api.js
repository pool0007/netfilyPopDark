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
    
    // Verificar y modificar la tabla
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
    
    // OPCIONAL: Descomenta la siguiente línea si quieres reiniciar completamente la base de datos
    // await client.query('DELETE FROM clicks');
    
    console.log('✅ Database initialized - Ready for all countries');
    
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

// Función para obtener código de país
const getCountryCode = (countryName) => {
  const countryMap = {
    // Países más comunes para mejor performance
    'United States': 'us', 'China': 'cn', 'Japan': 'jp', 'Germany': 'de',
    'India': 'in', 'United Kingdom': 'gb', 'France': 'fr', 'Italy': 'it',
    'Brazil': 'br', 'Canada': 'ca', 'South Korea': 'kr', 'Russia': 'ru',
    'Spain': 'es', 'Australia': 'au', 'Mexico': 'mx', 'Indonesia': 'id',
    'Netherlands': 'nl', 'Saudi Arabia': 'sa', 'Turkey': 'tr', 'Switzerland': 'ch',
    'Argentina': 'ar', 'Chile': 'cl', 'Colombia': 'co', 'Peru': 'pe'
  };
  
  return countryMap[countryName] || 'un';
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
          message: 'PopCat API is running - All countries allowed'
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
      
      // PERMITIR CUALQUIER PAÍS - Sin restricciones
      const finalCountryCode = country_code || getCountryCode(country);
      
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
          newCount: updateResult.rows[0]?.total_clicks,
          message: 'Click registered successfully - All countries welcome!'
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
          total_countries: result.rows.length
        })
      };
    }
    
    if (path === 'reset' && event.httpMethod === 'POST') {
      // Endpoint para resetear completamente la base de datos
      const client = await pool.connect();
      await client.query('DELETE FROM clicks');
      client.release();
      
      console.log('🗑️ Database completely reset');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Database reset successfully - All data cleared',
          timestamp: new Date().toISOString()
        })
      };
    }
    
    if (path === 'countries' && event.httpMethod === 'GET') {
      // Endpoint para ver todos los países en la base de datos
      const result = await pool.query(
        "SELECT country, total_clicks FROM clicks ORDER BY country ASC"
      );
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          countries: result.rows,
          total: result.rows.length
        })
      };
    }
    
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ 
        error: 'Endpoint not found',
        available_endpoints: ['/health', '/click', '/leaderboard', '/reset', '/countries']
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
