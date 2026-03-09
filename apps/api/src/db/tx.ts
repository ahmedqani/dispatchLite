import type { PoolClient, QueryResult, QueryResultRow } from "pg";
import { pool } from "./pool.js";

export interface DbExecutor {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ) => Promise<QueryResult<T>>;
}

export const withTransaction = async <T>(runInTransaction: (db: DbExecutor) => Promise<T>): Promise<T> => {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await runInTransaction({
      query: <R extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) =>
        client.query<R>(text, params)
    });
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
