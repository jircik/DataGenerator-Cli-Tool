import { ZodError } from 'zod';
import * as logger from './logger.js';

export function formatZodError(error: ZodError): void {
  for (const issue of error.issues) {
    const fieldPath = issue.path.length > 0 ? issue.path.join('.') : 'root';
    logger.error(`[${fieldPath}] ${issue.message}`);
  }
}