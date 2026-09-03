/** Acesso enxuto ao MySQL gerenciado; mantém a persistência fora da camada visual. */
import mysql from "mysql2/promise";

let pool;

export function getDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está disponível.");
  if (!pool) {
    pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      connectionLimit: 8,
      enableKeepAlive: true,
    });
  }
  return pool;
}

export async function query(sql, params = []) {
  const [rows] = await getDatabase().execute(sql, params);
  return rows;
}

export async function one(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

/** Executa mudanças correlacionadas no mesmo banco, revertendo tudo se alguma etapa falhar. */
export async function transaction(callback) {
  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const tx = {
      query: async (sql, params = []) => {
        const [rows] = await connection.execute(sql, params);
        return rows;
      },
      one: async (sql, params = []) => {
        const [rows] = await connection.execute(sql, params);
        return rows[0] || null;
      },
    };
    const result = await callback(tx);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}
