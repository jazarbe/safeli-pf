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
  'muertesporsiniestrosviales': 'muertesPorSiniestrosViales'
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
  const { data: tiposData, error: tiposError } = await supabase.from('Tipos').select('nombre, gravedad');
  if (tiposError) throw new Error(`Error al obtener Tipos: ${tiposError.message}`);

  const { data: subtiposData, error: subtiposError } = await supabase.from('Subtipos').select('nombre, gravedad');
  if (subtiposError) throw new Error(`Error al obtener Subtipos: ${subtiposError.message}`);

  // Mapas nombre -> gravedad para lookup O(1)
  const gravedadPorTipo    = Object.fromEntries(tiposData.map(t => [t.nombre, t.gravedad]));
  const gravedadPorSubtipo = Object.fromEntries(subtiposData.map(s => [s.nombre, s.gravedad]));

  const registros = [];

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

    // [GEMINI] Leer valores del Excel y limpiarlos
    const tipoExcel = indiceTipo !== -1 && fila[indiceTipo] ? fila[indiceTipo].toString().toLowerCase().trim() : '';
    const subtipoExcel = indiceSubtipo !== -1 && fila[indiceSubtipo] ? fila[indiceSubtipo].toString().toLowerCase().trim() : '';

    // [GEMINI] Buscar la equivalencia exacta en nuestros diccionarios
    const tipoEnum = MAPPING_TIPO[tipoExcel] || 'robo'; // [GEMINI] 'robo' por defecto si no coincide
    const subtipoEnum = MAPPING_SUBTIPO[subtipoExcel] || null;

    // Calcular gravedad = gravedad del Tipo × gravedad del Subtipo
    const gravTipo    = gravedadPorTipo[tipoEnum] ?? null;
    const gravSubtipo = subtipoEnum ? (gravedadPorSubtipo[subtipoEnum] ?? null) : null;
    const gravedad    = gravTipo !== null && gravSubtipo !== null
      ? gravTipo * gravSubtipo
      : null;

    registros.push({
      ubicacion: `(${lng}, ${lat})`, 
      fecha: fechaFormateada,
      tipo: tipoEnum,       
      subTipo: subtipoEnum, 
      gravedad
    });
  }

  if (registros.length === 0) {
    throw new Error("No se pudo extraer ningún registro válido.");
  }

  const { error } = await supabase.from('Delitos').insert(registros);
  
  if (error) {
    console.error("Error devuelto por Supabase al insertar:", error);
    throw new Error(`Error de Supabase: ${error.message}`);
  }
  
  return registros.length;
}

module.exports = { importarDelitos };