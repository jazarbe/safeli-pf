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
    try {
      // 1. Paginación y ordenamiento por defecto (Normalizamos lo que viene del front)
      const pageNum  = parseInt(filters.page) || 1;
      const pageSize = Math.min(parseInt(filters.page_size || filters.pageSize) || 50, 200);
      
      const sortByRaw = filters.sort_by || filters.sortBy || 'id';
      const sortDir   = (filters.sort_dir || filters.sortDir || 'asc').toLowerCase();

      // Mapeo estricto de columnas para Supabase
      const validSortColumns = { id: 'id', fecha: 'fecha', gravedad: 'gravedad', idsubtipo: 'idSubtipo', idsubtipo: 'idSubtipo' };
      const sortBy = validSortColumns[sortByRaw.toLowerCase()] || 'id';

      const fromIdx = (pageNum - 1) * pageSize;
      const toIdx   = fromIdx + pageSize - 1;

      // 2. Base de la Query con Joins
      let query = supabase
        .from('Delitos')
        .select(`
          id,
          ubicacion,
          fecha,
          gravedad,
          idSubtipo,
          Subtipos (
            nombre,
            idTipo,
            Tipos ( nombre )
          )
        `, { count: 'exact' });

      // 3. ADAPTADOR Y APLICACIÓN DE FILTROS CORREGIDO (Soporta camelCase del front y snake_case antiguo)
      const id_desde     = filters.idDesde   || filters.id_desde;
      const id_hasta     = filters.idHasta   || filters.id_hasta;
      const mes          = filters.mes;
      const anio         = filters.anio;
      const gravedad_min = filters.gravMin   || filters.gravedad_min;
      const gravedad_max = filters.gravMax   || filters.gravedad_max;
      const id_tipo      = filters.idTipo    || filters.id_tipo;
      const id_subtipo   = filters.idSubtipo || filters.id_subtipo;

      // Aplicación en cascada sobre Supabase
      if (id_desde)     query = query.gte('id', id_desde);
      if (id_hasta)     query = query.lte('id', id_hasta);
      if (gravedad_min) query = query.gte('gravedad', parseFloat(gravedad_min));
      if (gravedad_max) query = query.lte('gravedad', parseFloat(gravedad_max));
      
      if (id_subtipo) {
        query = query.eq('idSubtipo', id_subtipo);
      } else if (id_tipo) {
        // Filtro avanzado por Tipo (atraviesa la relación de tablas de Supabase)
        query = query.eq('Subtipos.idTipo', id_tipo);
      }

      if (mes)  query = query.filter('fecha', 'raw', `extract(month from fecha) = ${parseInt(mes)}`);
      if (anio) query = query.filter('fecha', 'raw', `extract(year from fecha) = ${parseInt(anio)}`);

      // 4. Ejecución de ordenamiento y rangos
      query = query
        .order(sortBy, { ascending: sortDir === 'asc' })
        .range(fromIdx, toIdx);

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
      console.error('Server error in DBRepository:', err);
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