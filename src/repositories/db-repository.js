import sql from '../db.js';
import pkg from '@supabase/supabase-js';
const { createClient } = pkg;

// [GEMINI] Habilitar bypass de TLS únicamente si se especifica en desarrollo (Proxy de escuelas)
if (process.env.NODE_TLS_ALLOW_SELF_SIGNED === 'true' || process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn('WARNING: TLS certificate validation is disabled (NODE_TLS_ALLOW_SELF_SIGNED)');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// [GEMINI] Formato auxiliar para los meses (ej. "3" -> "03")
function pad(n) {
  return String(n).padStart(2, '0');
}

export default class DBRepository {
  async getDelitosAsync(filters) {
    const { mes, anio, tipos_delito } = filters;
    console.log('DEBUG - Filtros de delincuencia solicitados:', { mes, anio, tipos_delito });

    try {
        let query = supabase.from('Delitos').select('*');

        // [GEMINI] Lógica secuencial de filtrado temporal por Fechas
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

        // // [GEMINI] Filtro espacial por Barrio
        // if (barrio) {
        //   query = query.ilike('barrio', `%${barrio}%`);
        // }

        // [GEMINI] Filtro categórico por Tipos de Delito
        if (tipos_delito) {
            const listaDelitos = tipos_delito.split(',');
            query = query.in('tipo', listaDelitos);
        }

        const { data, error } = await query;

        if (error) {
        console.error('Supabase query error:', error);
        return res.status(400).json({ message: 'Error en la consulta a la base de datos', details: error.message });
        }

        return res.json(data);
    } catch (err) {
        console.error('Server error:', err);
        return res.status(500).json({ message: 'Error interno del servidor', details: err.message });
    }
};
}