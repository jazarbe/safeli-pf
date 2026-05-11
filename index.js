require('dotenv').config();
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

  if (error) return res.status(400).json(error);
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
  console.log(`http://localhost:${PORT}/`)
});