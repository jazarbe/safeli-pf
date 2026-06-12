const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function corregirCoordenada(valor) {
  if (valor === undefined || valor === null) return null;
  let str = valor.toString().trim();
  if (!str) return null;

  const esNegativo = str.startsWith('-');
  str = str.replace(/[^0-9]/g, '');

  if (str.length < 2) return null;
  let numeroCorregido = str.substring(0, 2) + '.' + str.substring(2);

  if (esNegativo) numeroCorregido = '-' + numeroCorregido;
  return numeroCorregido;
}

// [GEMINI] DICCIONARIOS DE CONVERSIÓN (Traduce lo que dice el Excel a tus Enums exactos)
const MAPPING_TIPO = {
  'robo': 'robo',
  'hurto': 'hurto',
  'amenazas': 'amenazas',
  'lesiones': 'lesiones',
  'vialidad': 'vialidad',
  'homicidios': 'homicidios'
};

const MAPPING_SUBTIPO = {
  'total': 'total',
  'robo total': 'total',
  'hurto total': 'total',
  'automotor': 'automotor',
  'robo automotor': 'automotor',
  'hurto automotor': 'automotor',
  'dolosas': 'dolosas',
  'lesiones dolosas': 'dolosas',
  'dolosos': 'dolosos',
  'homicidios dolosos': 'dolosos',
  'lesiones por siniestros viales': 'lesionesPorSiniestrosViales',
  'lesionesporsiniestrosviales': 'lesionesPorSiniestrosViales',
  'muertes por siniestros viales': 'muertesPorSiniestrosViales',
  'muertesporsiniestrosviales': 'muertesPorSiniestrosViales',
  'amenazas': 'no_aplica'
};

async function importarDelitos(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  
  const filasMatriz = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (filasMatriz.length === 0) throw new Error("El archivo Excel está vacío.");

  let indiceLat = -1, indiceLng = -1, indiceFecha = -1, indiceTipo = -1, indiceSubtipo = -1;

  for (let i = 0; i < Math.min(filasMatriz.length, 10); i++) {
    const fila = filasMatriz[i];
    for (let j = 0; j < fila.length; j++) {
      if (!fila[j]) continue;
      const celdaTexto = fila[j].toString().toLowerCase().trim();
      if (celdaTexto.includes('latitud')) indiceLat = j;
      if (celdaTexto.includes('longitud')) indiceLng = j;
      if (celdaTexto.includes('fecha')) indiceFecha = j;
      if (celdaTexto.includes('tipo') && !celdaTexto.includes('sub')) indiceTipo = j;
      if (celdaTexto.includes('subtipo')) indiceSubtipo = j;
    }
    if (indiceLat !== -1 && indiceLng !== -1) {
      filasMatriz.splice(0, i + 1); 
      break;
    }
  }

  if (indiceLat === -1 || indiceLng === -1) {
    throw new Error("No se encontraron las columnas 'latitud' y 'longitud'.");
  }

  // Traer tablas de Tipos y Subtipos una sola vez para calcular gravedades
  const { data: tiposData, error: tiposError } = await supabase.from('Tipos').select('*');
  if (tiposError) throw new Error(`Error al obtener Tipos: ${tiposError.message}`);

  const { data: subtiposData, error: subtiposError } = await supabase.from('Subtipos').select('*');
  if (subtiposError) throw new Error(`Error al obtener Subtipos: ${subtiposError.message}`);

  const gravedadPorTipo = Object.fromEntries(tiposData.map(t => [t.nombre.toLowerCase(), t.gravedad]));
  const nombreTipoPorId = Object.fromEntries(tiposData.map(t => [t.id, t.nombre.toLowerCase()]));
  const idPorSubtipoCombinado = {};
  const gravedadPorSubtipoCombinado = {};

  for (const s of subtiposData) {
    const nombreTipoBase = nombreTipoPorId[s.idTipo]; // Busca si el ID corresponde a 'robo', 'hurto', etc.
    if (nombreTipoBase) {
      const claveCombinada = `${nombreTipoBase}_${s.nombre.toLowerCase()}`; // Ejemplo: 'robo_total'
      idPorSubtipoCombinado[claveCombinada] = s.id;
      gravedadPorSubtipoCombinado[claveCombinada] = s.gravedad;
    }
  }

  const registros = [];
  let filasOmitidas = 0;

  for (const fila of filasMatriz) {
    const latRaw = fila[indiceLat];
    const lngRaw = fila[indiceLng];
    if (latRaw === undefined || latRaw === null || lngRaw === undefined || lngRaw === null) continue;

    const lat = corregirCoordenada(latRaw);
    const lng = corregirCoordenada(lngRaw);
    if (!lat || !lng) continue;

    const fechaRaw = indiceFecha !== -1 ? fila[indiceFecha] : null;
    let fechaFormateada = null;

    if (fechaRaw !== undefined && fechaRaw !== null) {
      let parsedDate;

      // [GEMINI] SI EXCEL LO DEVOLVIÓ COMO SU NÚMERO INTERNO (Ej: 45292)
      if (typeof fechaRaw === 'number') {
        // [GEMINI] XLSX.SSF.parse_date_code convierte el número de Excel en un objeto {y, m, d, ...]
        const dateObj = XLSX.SSF.parse_date_code(fechaRaw);
        // [GEMINI] Creamos la fecha usando año, mes (0-11 en JS) y día
        parsedDate = new Date(dateObj.y, dateObj.m - 1, dateObj.d);
      } else {
        // [GEMINI] SI VINO COMO UN TEXTO NORMAL (Ej: "1/1/2024")
        parsedDate = new Date(fechaRaw);
      }

      // [GEMINI] Validamos que sea una fecha correcta antes de guardarla
      if (!isNaN(parsedDate.getTime())) {
        // [GEMINI] Sumamos la diferencia horaria local para evitar que se atrase un día al pasar a ISO
        const offset = parsedDate.getTimezoneOffset();
        const dateCorrected = new Date(parsedDate.getTime() - (offset * 60 * 1000));
        fechaFormateada = dateCorrected.toISOString().split('T')[0];
      }
    }

    // Mapeo de Categorías
    const tipoExcel = indiceTipo !== -1 && fila[indiceTipo] ? fila[indiceTipo].toString().toLowerCase().trim() : '';
    const subtipoExcel = indiceSubtipo !== -1 && fila[indiceSubtipo] ? fila[indiceSubtipo].toString().toLowerCase().trim() : '';

    // Buscar la equivalencia exacta en nuestros diccionarios
    const tipoEnum = MAPPING_TIPO[tipoExcel] || 'robo'; // 'robo' por defecto si no coincide
    const subtipoEnum = MAPPING_SUBTIPO[subtipoExcel] || null;

    if (!subtipoEnum) {
      filasOmitidas++;
      continue;
    }

    const claveBusqueda = `${tipoEnum.toLowerCase()}_${subtipoEnum.toLowerCase()}`;

    const gravTipo = gravedadPorTipo[tipoEnum.toLowerCase()] ?? null;
    const gravSubtipo = gravedadPorSubtipoCombinado[claveBusqueda] ?? null;
    const idSubtipo = idPorSubtipoCombinado[claveBusqueda] ?? null;

    const gravedad = (gravTipo !== null && gravSubtipo !== null)
      ? (gravTipo * gravSubtipo)
      : null;

    if (gravedad === null || idSubtipo === null) {
      console.warn(`[Fila Omitida] No se cruzó en DB. Tipo: ${tipoEnum}, Subtipo: ${subtipoEnum}`);
      filasOmitidas++;
      continue; 
    }

    registros.push({
      ubicacion: `(${lat}, ${lng})`,
      fecha: fechaFormateada,
      gravedad: gravedad,
      idSubtipo: idSubtipo
    });
  }

  if (registros.length === 0) {
    throw new Error(`No se pudo extraer ningún registro válido. (Se omitieron ${filasOmitidas} filas por violar restricciones NOT NULL)`);
  }

  console.log(`Intentando insertar ${registros.length} registros válidos. Se ignoraron ${filasOmitidas} filas inválidas.`);

  // [GEMINI] Inserción controlada por lotes (Chunks) de 1000 para evitar que Supabase/PostgREST aborte por Timeouts
  const TAMANIO_LOTE = 1000;
  for (let i = 0; i < registros.length; i += TAMANIO_LOTE) {
    const lote = registros.slice(i, i + TAMANIO_LOTE);
    const { error } = await supabase.from('Delitos').insert(lote);
    
    if (error) {
      console.error("Error devuelto por Supabase al insertar el lote:", error);
      throw new Error(`Error de Supabase en lote index ${i}: ${error.message} - Detalles: ${error.details}`);
    }
  }
  
  return registros.length;
}

module.exports = { importarDelitos };