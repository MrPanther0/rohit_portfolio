import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { AppError, NotFoundError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { isProd } from '../config/env.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl}`));
};

function translatePrisma(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case 'P2002': {
      const target = (error.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return new AppError(`A record with this ${target} already exists`, 409, 'conflict');
    }
    case 'P2003':
      return new AppError('Related record does not exist', 400, 'foreign_key_violation');
    case 'P2025':
      return new AppError('Record not found', 404, 'not_found');
    default:
      return new AppError('Database request failed', 500, 'database_error');
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let error: AppError;

  if (err instanceof AppError) {
    error = err;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    error = translatePrisma(err);
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    error = new AppError('Invalid database query', 400, 'bad_request');
  } else if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    error = new AppError(err.message, status, err.code.toLowerCase());
  } else if (err instanceof SyntaxError && 'body' in err) {
    error = new AppError('Malformed JSON body', 400, 'bad_request');
  } else {
    error = new AppError(
      isProd ? 'Something went wrong' : ((err as Error)?.message ?? 'Unknown error'),
      500,
      'internal_error',
    );
  }

  const log = { err, statusCode: error.statusCode, path: req.originalUrl, method: req.method };
  if (error.statusCode >= 500) logger.error(log, error.message);
  else logger.warn(log, error.message);

  res.status(error.statusCode).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
      ...(isProd || error.statusCode < 500 ? {} : { stack: (err as Error)?.stack }),
    },
  });
};
