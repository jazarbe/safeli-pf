import { importarDelitos } from './backOffice.js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// app.get('/usuarios', async (req, res) => {
//   const { data, error } = await supabase.from('Usuarios').select('nombre, apellido');
//   if (error) return res.status(400).json(error);
//   res.json(data);
// });

app.get('/', (req, res) => {
  res.send('<input type="file" id="fileInput" required><button type="submit" onclick="importarDelitos()">Subir</button>');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
  console.log(`http://localhost:${PORT}/`)
});