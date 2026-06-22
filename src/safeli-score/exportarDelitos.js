const fs = require('fs');
const path = require('path'); 
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

console.log('🔗 Intentando conectar a:', process.env.SUPABASE_URL);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function exportarDelitosParaOSRM() {
    try {
        console.log('🔄 Extrayendo delitos de Supabase...');
        
        const { data: delitos, error } = await supabase
            .from('delitos_para_algoritmo')
            .select('id, gravedad, ubicacion');

        if (error) throw error;

        let contenidoLua = `-- Archivo generado automáticamente\n`;
        contenidoLua += `local M = {}\n`;
        contenidoLua += `M.zonas = {\n`;

        delitos.forEach((delito) => {
            if (delito.ubicacion && typeof delito.ubicacion === 'string') {
                const stringLimpio = delito.ubicacion.replace(/[\(\)]/g, '');
                const partes = stringLimpio.split(',');
                
                const lat = parseFloat(partes[0]);
                const lng = parseFloat(partes[1]);

                if (!isNaN(lat) && !isNaN(lng)) {
                    const radioMetros = delito.gravedad * 13.5; 

                    contenidoLua += `  {lat = ${lat}, lng = ${lng}, radio = ${radioMetros}, gravedad = ${delito.gravedad}},\n`;
                }
            } // <--- CORREGIDO: Llave de cierre agregada correctamente
        });

        contenidoLua += `}\n`;
        contenidoLua += `return M\n`;

        fs.writeFileSync('./delitos_data.lua', contenidoLua);
        console.log(`✅ Archivo 'delitos_data.lua' generado con éxito con ${delitos.length} zonas.`);

    } catch (err) {
        console.error('Error generando el archivo:', err.message);
    }
}

exportarDelitosParaOSRM();