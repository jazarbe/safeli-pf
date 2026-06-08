const DBRepository = require("../repositories/db-repository.js");

const dbRepository = new DBRepository();

module.exports = class DBService {
  async getDelitosAsync(filters) {
    try {
      return await dbRepository.getDelitosAsync(filters);
    } catch (err) {
      console.error('Error en DBService:', err);
      throw new Error('Error al obtener los delitos');
    }
  }

  async getTiposAsync() {
    try {
      return await dbRepository.getTiposAsync();
    } catch (err) {
      console.error('Error en DBService getTipos:', err);
      throw new Error('Error al obtener los tipos');
    }
  }

  async getSubtiposAsync(idTipo) {
    try {
      return await dbRepository.getSubtiposAsync(idTipo);
    } catch (err) {
      console.error('Error en DBService getSubtipos:', err);
      throw new Error('Error al obtener los subtipos');
    }
  }
};