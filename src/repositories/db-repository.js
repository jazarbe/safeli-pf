const { createClient } = require('@supabase/supabase-js');

if (process.env.NODE_TLS_ALLOW_SELF_SIGNED === 'true' || process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn('WARNING: TLS certificate validation is disabled');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function pad(n) {
  return String(n).padStart(2, '0');
}

module.exports = class DBRepository {

  /**
   * Devuelve delitos con paginación server-side, filtros y JOIN a Subtipos/Tipos.
   *
   * Query params soportados:
   *   page          número de página (default: 1)
   *   page_size     registros por página (default: 50, max: 200)
   *   sort_by       columna (default: 'id')
   *   sort_dir      'asc' | 'desc' (default: 'asc')
   *   mes           1-12
   *   anio          YYYY
   *   id_desde      rango id inferior
   *   id_hasta      rango id superior
   *   gravedad_min  float
   *   gravedad_max  float
   *   id_subtipo    id exacto de subtipo
   *   tipos_delito  nombres separados por coma (filtra via JOIN)
   */
  async getDelitosAsync(filters = {}) {
    const {
      page = 1,
      page_size = 50,
      sort_by = 'id',
      sort_dir = 'asc',
      mes,
      anio,
      id_desde,
      id_hasta,
      gravedad_min,
      gravedad_max,
      id_subtipo,
      tipos_delito,
    } = filters;

    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(page_size, 10) || 50));
    const from = (pageNum - 1) * pageSize;
    const to   = from + pageSize - 1;

    const COLUMNAS_VALIDAS = new Set(['id', 'fecha', 'gravedad', 'idSubtipo']);
    const columnaOrden = COLUMNAS_VALIDAS.has(sort_by) ? sort_by : 'id';
    const ascending = sort_dir !== 'desc';

    console.log('DEBUG - getDelitosAsync:', { pageNum, pageSize, columnaOrden, ascending, ...filters });

    try {
      // SELECT con JOIN: trae nombre de subtipo y nombre de tipo
      let query = supabase
        .from('Delitos')
        .select(
          `id,
           ubicacion,
           fecha,
           gravedad,
           idSubtipo,
           Subtipos!idSubtipo (
             id,
             nombre,
             Tipos!idTipo (
               id,
               nombre
             )
           )`,
          { count: 'exact' }
        )
        .order(columnaOrden, { ascending })
        .range(from, to);

      // --- Filtros temporales ---
      if (mes && anio) {
        const m = pad(mes);
        const end = new Date(anio, Number(m), 0).toISOString().slice(0, 10);
        query = query.gte('fecha', `${anio}-${m}-01`).lte('fecha', end);
      } else if (anio) {
        query = query.gte('fecha', `${anio}-01-01`).lte('fecha', `${anio}-12-31`);
      } else if (mes) {
        query = query.ilike('fecha', `%-${pad(mes)}-%`);
      }

      // --- Filtros numéricos ---
      if (id_desde)      query = query.gte('id', id_desde);
      if (id_hasta)      query = query.lte('id', id_hasta);
      if (gravedad_min)  query = query.gte('gravedad', gravedad_min);
      if (gravedad_max)  query = query.lte('gravedad', gravedad_max);
      if (id_subtipo)    query = query.eq('idSubtipo', id_subtipo);

      const { data, error, count } = await query;

      if (error) {
        console.error('Supabase query error:', error);
        throw new Error(error.message);
      }

      // Aplanar el JOIN para que el frontend reciba objetos simples
      const rows = (data || []).map(d => ({
        id:           d.id,
        ubicacion:    d.ubicacion,
        fecha:        d.fecha,
        gravedad:     d.gravedad,
        idSubtipo:    d.idSubtipo,
        subtipo:      d.Subtipos?.nombre ?? null,
        tipo:         d.Subtipos?.Tipos?.nombre ?? null,
      }));

      return {
        data:       rows,
        total:      count ?? 0,
        page:       pageNum,
        page_size:  pageSize,
        total_pages: Math.ceil((count ?? 0) / pageSize),
      };

    } catch (err) {
      console.error('Server error:', err);
      throw err;
    }
  }

  /** Devuelve todos los Tipos (para poblar el filtro del front) */
  async getTiposAsync() {
    const { data, error } = await supabase.from('Tipos').select('id, nombre').order('nombre');
    if (error) throw new Error(error.message);
    return data;
  }

  /** Devuelve Subtipos, opcionalmente filtrados por idTipo */
  async getSubtiposAsync(idTipo = null) {
    let query = supabase.from('Subtipos').select('id, nombre, idTipo').order('nombre');
    if (idTipo) query = query.eq('idTipo', idTipo);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }
};