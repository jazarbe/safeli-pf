const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY 
);


app.get('/api/delitos', async (req, res) => {
  const { mes, anio, tipos_delito, barrio } = req.query;

  let query = supabase.from('delitos').select('*');

  if (mes) query = query.eq('mes', mes);
  if (anio) query = query.eq('anio', anio);
  if (barrio) query = query.ilike('barrio', `%${barrio}%`);
  
  if (tipos_delito) {
    const listaDelitos = tipos_delito.split(',');
    query = query.in('tipo_delito', listaDelitos);
  }

    const { data, error } = await query;

    if (error) return res.status(400).json(error);
    if (error) return res.status(404).json(error);
    res.json(data);
});