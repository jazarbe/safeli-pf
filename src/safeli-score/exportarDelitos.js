const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// 1. Inicializás tu cliente de Supabase
const supabase = createClient('TU_SUPABASE_URL', 'TU_SUPABASE_ANON_KEY');

async function exportarDelitosParaOSRM() {
    try {
        console.log('🔄 Extrayendo delitos de Supabase...');
        
        // Traemos los delitos. Asumo que 'ubicacion' viene como la estructura de tu DB
        const { data: delitos, error } = await supabase
            .from('tus_delitos')
            .select('id, gravedad, ubicacion');

        if (error) throw error;

        // 2. Empezamos a construir el string de texto en formato Lua
        let contenidoLua = `-- Archivo generado automáticamente\n`;
        contenidoLua += `local M = {}\n`;
        contenidoLua += `M.zonas = {\n`;

        delitos.forEach((delito) => {
            // Parseamos el punto de Postgres. 
            // Si en tu JS viene como objeto {x, y} o string '(lat,lng)', lo normalizamos:
            // Nota: En Postgres Point suele ser (Lng, Lat) o (Lat, Lng) según cómo lo guardaste.
            const lat = delito.ubicacion.x; 
            const lng = delito.ubicacion.y;

            // CLASIFICACIÓN UNIFICADA: Definimos el radio en metros basado en la gravedad
            const radioMetros = delito.gravedad * 15; 

            // Agregamos la línea al formato de tabla de Lua
            contenidoLua += `  {lat = ${lat}, lng = ${lng}, radio = ${radioMetros}, gravedad = ${delito.gravedad}},\n`;
        });

        contenidoLua += `}\n`;
        contenidoLua += `return M\n`;

        // 3. Guardamos el archivo físicamente en tu carpeta del proyecto
        // Este archivo es el que después va a leer OSRM
        fs.writeFileSync('./delitos_data.lua', contenidoLua);
        console.log('✅ Archivo delitos_data.lua generado con éxito para OSRM.');

    } catch (err) {
        console.error('❌ Error generando el archivo:', err.message);
    }
}

exportarDelitosParaOSRM();