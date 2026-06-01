import DBService from '../services/db-service';
const dbService = new DBService();

const express = require('express');
const router = require('express').Router();
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

// consulta para mostrar los delitos filtrados por mes, año y tipo de delito
// a terminar
router.get('/', async (req, res) => {
  try {
      const data = await dbService.getDelitosAsync(req.query);
      res.json(data);
  } catch (err) {
      console.error('Error en DBController:', err);
      res.status(500).json({ message: 'Error al obtener los delitos', details: err.message });
  }
});