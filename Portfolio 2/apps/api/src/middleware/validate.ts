import type { RequestHandler } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { ValidationError } from '../lib/errors.js';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

function formatIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
    code: issue.code,
  }));
}

/**
 * Validates and *replaces* the request segments with their parsed output so
 * downstream handlers receive coerced, fully typed values.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) {
        // Express 4 exposes `query` as a getter on some setups; redefine to stay writable.
        Object.defineProperty(req, 'query', {
          value: schemas.query.parse(req.query),
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) return next(new ValidationError(formatIssues(error)));
      next(error);
    }
  };
}

export type Infer<T extends ZodTypeAny> = z.infer<T>;
