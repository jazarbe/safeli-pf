const DBRepository = require("../repositories/db-repository.js");

const dbRepository = new DBRepository();

module.exports = class DBService {
  async getDelitosAsync(filters) {
    try {
      const data = await dbRepository.getDelitosAsync(filters);
      return data;
    } catch (err) {
      console.error('Error en DBService:', err);
      throw new Error('Error al obtener los delitos');
    }
  }
};