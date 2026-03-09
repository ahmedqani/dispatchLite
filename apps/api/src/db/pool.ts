import { Pool, type QueryResult, type QueryResultRow } from "pg";

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST ?? "127.0.0.1",
        port: Number(process.env.PGPORT ?? 5432),
        database: process.env.PGDATABASE ?? "dispatchlite",
        user: process.env.PGUSER ?? "dispatchlite",
        password: process.env.PGPASSWORD ?? "dispatchlite",
      }
);

export { pool };

export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};
