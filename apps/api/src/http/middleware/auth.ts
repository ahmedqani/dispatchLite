import type { NextFunction, Request, Response } from "express";
import { findUserByToken, type AuthUser } from "../../db/queries/auth.js";
import { ApiError } from "./error.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const parseBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token.trim();
};

export const requireAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = parseBearerToken(req.header("authorization"));

    if (!token) {
      throw new ApiError({
        code: "UNAUTHORIZED",
        message: "Missing or invalid Authorization header.",
        statusCode: 401
      });
    }

    const user = await findUserByToken(token);
    if (!user) {
      throw new ApiError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired bearer token.",
        statusCode: 401
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
