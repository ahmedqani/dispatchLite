import type { NextFunction, Request, Response } from "express";

export interface ApiErrorShape {
  code: string;
  message: string;
  statusCode: number;
}

export class ApiError extends Error {
  code: string;
  statusCode: number;

  constructor({ code, message, statusCode }: ApiErrorShape) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(
    new ApiError({
      code: "NOT_FOUND",
      message: `Route not found: ${req.method} ${req.path}`,
      statusCode: 404
    })
  );
};

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      ok: false,
      error: {
        code: error.code,
        message: error.message
      }
    });
    return;
  }

  res.status(500).json({
    ok: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error."
    }
  });
};
