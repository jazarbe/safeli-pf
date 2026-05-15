require('dotenv').config();

// ESTO FUERZA A NODE A IGNORAR EL ERROR DEL CERTIFICADO DE LA ESCUELA
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

// ... resto del código
// require('dotenv').config();

// Allow disabling TLS verification for development when behind a proxy
// Set NODE_TLS_ALLOW_SELF_SIGNED=true in your .env to enable.
if (process.env.NODE_TLS_ALLOW_SELF_SIGNED === 'true') {
  // WARNING: disabling TLS verification is insecure and should NEVER be used in production.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn('WARNING: TLS certificate validation is disabled (NODE_TLS_ALLOW_SELF_SIGNED=true)');
}
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY 
);

app.get('/', async (req, res) => {
  const { mes, anio, tipos_delito, barrio } = req.query;
  try {
    let query = supabase.from('delitos').select('*');

    function pad(n) {
      return String(n).padStart(2, '0');
    }

    if (mes && anio) {
      const m = pad(mes);
      const start = `${anio}-${m}-01`;
      const end = new Date(anio, Number(m), 0).toISOString().slice(0, 10);
      query = query.gte('fecha', start).lte('fecha', end);
    } else if (anio) {
      const start = `${anio}-01-01`;
      const end = `${anio}-12-31`;
      query = query.gte('fecha', start).lte('fecha', end);
    } else if (mes) {
      const m = pad(mes);
      query = query.ilike('fecha', `%-${m}-%`);
    }

    if (barrio) query = query.ilike('barrio', `%${barrio}%`);

    if (tipos_delito) {
      const listaDelitos = tipos_delito.split(',');
      query = query.in('tipo_delito', listaDelitos);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Supabase query error:', error);
        return res.status(400).json({ message: 'Query error', details: error?.message || error });
    }
    return res.json(data);
  } catch (err) {
    console.error('Server error handling / request:', err);
    return res.status(500).json({ message: 'Server error', details: err?.message || String(err), stack: err?.stack });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
  console.log(`http://localhost:${PORT}/`)
});

// Health check to validate Supabase connectivity
app.get('/', async (req, res) => {
  const { mes, anio, tipos_delito, barrio } = req.query;

  // Esto te ayudará a ver qué llega en la terminal
  console.log("DEBUG - Parámetros recibidos:", { mes, anio, tipos_delito, barrio });

  try {
    let query = supabase.from('delitos').select('*');

    // Función auxiliar para el formato de mes
    function pad(n) {
      return String(n).padStart(2, '0');
    }

    // Lógica de filtrado por fechas
    if (mes && anio) {
      const m = pad(mes);
      const start = `${anio}-${m}-01`;
      const end = new Date(anio, Number(m), 0).toISOString().slice(0, 10);
      query = query.gte('fecha', start).lte('fecha', end);
    } else if (anio) {
      const start = `${anio}-01-01`;
      const end = `${anio}-12-31`;
      query = query.gte('fecha', start).lte('fecha', end);
    } else if (mes) {
      const m = pad(mes);
      query = query.ilike('fecha', `%-${m}-%`);
    }

    // Filtro por barrio
    if (barrio) query = query.ilike('barrio', `%${barrio}%`);

    // Filtro por tipos de delito
    if (tipos_delito) {
      const listaDelitos = tipos_delito.split(',');
      query = query.in('tipo_delito', listaDelitos);
    }

    // EJECUCIÓN DE LA QUERY
    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(400).json({ 
        message: 'Error en la consulta a la base de datos', 
        details: error.message 
      });
    }

    // Si todo sale bien, devolvemos los datos
    return res.json(data);

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ 
      message: 'Error interno del servidor', 
      details: err.message 
    });
  }
});
