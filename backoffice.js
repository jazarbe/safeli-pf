const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function corregirCoordenada(valor) {
  if (!valor) return null;
  let str = valor.toString().trim();
  
  // Si tiene más de un punto (ej: -34.585.182)
  if ((str.match(/\./g) || []).length > 1) {
    // Removemos el primer signo menos si existe para procesar el número puro
    const esNegativo = str.startsWith('-');
    if (esNegativo) str = str.substring(1);

    // Quitamos todos los puntos
    str = str.replace(/\./g, '');

    // Colocamos el punto decimal justo después de los primeros dos dígitos
    str = str.substring(0, 2) + '.' + str.substring(2);

    // Devolvemos el signo menos si correspondía
    if (esNegativo) str = '-' + str;
  }
  return str;
}

async function importarDelitos(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(sheet);

  const registros = [];

  for (const fila of filas) {
    // 1. Verificación estricta: Si no trae latitud o longitud, saltamos esta fila
    if (!fila['latitud'] || !fila['longitud']) {
      console.warn(`Fila omitida por falta de coordenadas:`, fila);
      continue;
    }

    // 2. Procesamos y limpiamos las coordenadas
    const lat = corregirCoordenada(fila['latitud']);
    const lng = corregirCoordenada(fila['longitud']);

    // Doble verificación por si la limpieza devolvió algo inválido
    if (!lat || !lng) {
      console.warn(`Fila omitida debido a coordenadas corruptas o inválidas:`, fila);
      continue;
    }

    // 3. Procesamos la fecha
    let fechaFormateada = null;
    if (fila['fecha']) {
      const parsedDate = new Date(fila['fecha']);
      if (!isNaN(parsedDate.getTime())) {
        fechaFormateada = parsedDate.toISOString().split('T')[0];
      }
    }

    // 4. Armamos el objeto asegurando que 'ubicacion' tenga datos válidos
    registros.push({
      ubicacion: `(${lng}, ${lat})`, // Formato Point: (longitud, latitud)
      fecha: fechaFormateada,
      tipo: fila['tipo'],
      subTipo: fila['subtipo'] || fila['subTipo'],
      gravedad: null
    });
  }

  // Si después de filtrar nos quedamos sin registros válidos, avisamos antes de ir a la DB
  if (registros.length === 0) {
    throw new Error('El archivo no contiene ninguna fila con coordenadas válidas de latitud y longitud.');
  }

  // Inserción masiva en Supabase
  const { error } = await supabase.from('Delitos').insert(registros);
  
  if (error) {
    console.error("Error detallado de Supabase:", error);
    throw error;
  }
  
  return registros.length;
}

module.exports = { importarDelitos };