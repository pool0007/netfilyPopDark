import { Pool } from 'pg';

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
};

let pool;

// Headers CORS
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Función para inicializar la base de datos
const initDB = async () => {
  if (!pool) {
    pool = new Pool(poolConfig);
  }
  
  try {
    const client = await pool.connect();
    
    // Verificar si la tabla existe
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'clicks'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      // Crear tabla si no existe
      await client.query(`
        CREATE TABLE clicks (
          country TEXT PRIMARY KEY,
          total_clicks BIGINT DEFAULT 0,
          country_code TEXT
        );
      `);
      console.log('✅ Table created');
    }
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ DB init error:', error);
    return false;
  }
};

export const handler = async (event) => {
  console.log('📥 API Request:', event.httpMethod, event.path);
  
  // Manejar CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  const path = event.path.replace('/.netlify/functions/api/', '').replace('/api/', '');
  
  try {
    // Endpoint de health (no necesita DB)
    if (path === 'health') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'OK',
          timestamp: new Date().toISOString(),
          message: 'PopCat API is running'
        })
      };
    }
    
    // Endpoint de test
    if (path === 'test') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'API test endpoint working',
          path: path
        })
      };
    }
    
    // Para endpoints que necesitan DB, inicializar primero
    const dbReady = await initDB();
    if (!dbReady) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Database connection failed'
        })
      };
    }
    
    // Reset endpoint
    if (path === 'reset' && event.httpMethod === 'POST') {
      try {
        const client = await pool.connect();
        await client.query('DELETE FROM clicks');
        client.release();
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Database reset successfully - All data cleared'
          })
        };
      } catch (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: error.message
          })
        };
      }
    }
    
    // Countries endpoint
    if (path === 'countries' && event.httpMethod === 'GET') {
      try {
        const client = await pool.connect();
        const result = await client.query(
          "SELECT country, total_clicks FROM clicks ORDER BY country ASC"
        );
        client.release();
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            countries: result.rows,
            total: result.rows.length
          })
        };
      } catch (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: error.message
          })
        };
      }
    }
    
    // Leaderboard endpoint
    if (path === 'leaderboard' && event.httpMethod === 'GET') {
      try {
        const client = await pool.connect();
        const result = await client.query(
          "SELECT country, total_clicks, country_code FROM clicks ORDER BY total_clicks DESC LIMIT 20"
        );
        client.release();
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            leaderboard: result.rows
          })
        };
      } catch (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: error.message
          })
        };
      }
    }
    
    // Click endpoint
    if (path === 'click' && event.httpMethod === 'POST') {
      try {
        const { country, country_code } = JSON.parse(event.body);
        
        if (!country) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Country is required'
            })
          };
        }
        
        const client = await pool.connect();
        
        // Insertar o actualizar
        const updateResult = await client.query(
          `INSERT INTO clicks (country, total_clicks, country_code)
           VALUES ($1, 1, $2)
           ON CONFLICT (country) 
           DO UPDATE SET total_clicks = clicks.total_clicks + 1
           RETURNING total_clicks`,
          [country, country_code || 'un']
        );
        
        const leaderboardResult = await client.query(
          "SELECT country, total_clicks, country_code FROM clicks ORDER BY total_clicks DESC LIMIT 20"
        );
        
        client.release();
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            leaderboard: leaderboardResult.rows,
            newCount: updateResult.rows[0]?.total_clicks
          })
        };
      } catch (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: error.message
          })
        };
      }
    }
    
    // Endpoint no encontrado
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
