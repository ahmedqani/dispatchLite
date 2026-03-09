import { query } from "../pool.js";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: "dispatcher" | "technician" | "client";
  technicianId: string | null;
}

interface AuthUserRow {
  id: string;
  email: string;
  display_name: string;
  role: "dispatcher" | "technician" | "client";
  technician_id: string | null;
}

export const findUserByToken = async (token: string): Promise<AuthUser | null> => {
  const result = await query<AuthUserRow>(
    `SELECT u.id, u.email, u.display_name, u.role, u.technician_id
     FROM auth_tokens t
     INNER JOIN users u ON u.id = t.user_id
     WHERE t.token = $1
       AND (t.expires_at IS NULL OR t.expires_at > now())
     LIMIT 1`,
    [token]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    technicianId: row.technician_id
  };
};
