const fs = require('fs');
const path = require('path'); // <- Nuevo: Nos ayuda a no errarle a las carpetas
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

console.log('🔗 Intentando conectar a:', process.env.SUPABASE_URL);

// 1. Inicializás tu cliente de Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function exportarDelitosParaOSRM() {
    try {
        console.log('🔄 Extrayendo delitos de Supabase...');
        
        // Traemos los delitos. Asumo que 'ubicacion' viene como la estructura de tu DB
        const { data: delitos, error } = await supabase
            .from('delitos_para_algoritmo')
            .select('id, gravedad, ubicacion');

        if (error) throw error;

        // 2. Empezamos a construir el string de texto en formato Lua
        let contenidoLua = `-- Archivo generado automáticamente\n`;
        contenidoLua += `local M = {}\n`;
        contenidoLua += `M.zonas = {\n`;

        delitos.forEach((delito) => {
            // CORRECCIÓN: Validamos y parseamos el string "(-34.585182,-58.453967)"
            if (delito.ubicacion && typeof delito.ubicacion === 'string') {
                // Removemos los paréntesis "(" y ")"
                const stringLimpio = delito.ubicacion.replace(/[\(\)]/g, '');
                // Separamos por la coma
                const partes = stringLimpio.split(',');
                
                // En tu DB, el primer valor es Latitud (-34.x) y el segundo es Longitud (-58.x)
                const lat = parseFloat(partes[0]);
                const lng = parseFloat(partes[1]);

                if (!isNaN(lat) && !isNaN(lng)) {
                    // CLASIFICACIÓN UNIFICADA: Definimos el radio en metros basado en la gravedad
                    const radioMetros = delito.gravedad * 13.5; 

                    // Agregamos la línea al formato de tabla de Lua
                    contenidoLua += `{lat = ${lat}, lng = ${lng}, radio = ${radioMetros}, gravedad = ${delito.gravedad}},\n`;
                }
        }});

        contenidoLua += `}\n`;
        contenidoLua += `return M\n`;

        // 3. Guardamos el archivo físicamente en tu carpeta del proyecto
        fs.writeFileSync('./delitos_data.lua', contenidoLua);
        console.log(`Archivo 'delitos_data.lua' generado con éxito con ${delitos.length} zonas.`);

    } catch (err) {
        console.error('Error generando el archivo:', err.message);
    }
}

exportarDelitosParaOSRM();