import DBRepository from "../repositories/db-repository";

const dbRepository = new DBRepository();

export default class DBService {
  async getDelitosAsync(filters) {
    try {
        const data = await dbRepository.getDelitosAsync(filters);
        return data;
    } catch (err) {
        console.error('Error en DBService:', err);
        throw new Error('Error al obtener los delitos');
    }
  }
}