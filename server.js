const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const DB_FILE = 'zonas.json';

// Leer datos
function leerZonas() {
  const data = fs.readFileSync(DB_FILE);
  return JSON.parse(data);
}

// Guardar datos
function guardarZonas(zonas) {
  fs.writeFileSync(DB_FILE, JSON.stringify(zonas, null, 2));
}

// GET zonas
app.get('/zonas', (req, res) => {
  res.json(leerZonas());
});

// POST zona
app.post('/zonas', (req, res) => {
  const zonas = leerZonas();

  const nueva = {
    id: Date.now(),
    ...req.body,
    fecha: new Date()
  };

  zonas.push(nueva);
  guardarZonas(zonas);

  res.json(nueva);
});

// DELETE zona
app.delete('/zonas/:id', (req, res) => {
  let zonas = leerZonas();
  zonas = zonas.filter(z => z.id != req.params.id);

  guardarZonas(zonas);
  res.send('ok');
});

app.listen(3000, () => console.log('Servidor corriendo en http://localhost:3000'));