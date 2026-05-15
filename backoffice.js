import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function importarDelitos(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(sheet);

    const registros = filas.map(fila => ({
        ubicacion: `(${fila['latitud']},${fila['longitud']})`,
        fecha: new Date(fila['fecha']).toISOString().split('T')[0],
        tipo: fila['tipo'],
        subTipo: fila['subtipo'],
    }));

  const { error } = await supabase.from('delitos').insert(registros);
  if (error) throw error;
}