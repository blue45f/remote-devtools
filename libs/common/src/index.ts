// Exceptions
export { ErrorCode, ErrorMessages } from './exceptions/error-codes.enum';
export { BusinessException, BusinessErrorResponse } from './exceptions/business.exception';

// i18n
export type { Lang } from './i18n';
export {
  DEFAULT_LANG,
  resolveLang,
  getErrorMessage,
  ErrorMessagesKo,
  GenericMessages,
} from './i18n';

// Filters
export {
  AllExceptionsFilter,
  ExceptionFilterOptions,
  EXCEPTION_FILTER_OPTIONS,
} from './filters/all-exceptions.filter';
export { HttpExceptionFilter } from './filters/http-exception.filter';
export { QueryFailedExceptionFilter } from './filters/query-failed-exception.filter';

// Interceptors
export { ResponseInterceptor, StandardResponse } from './interceptors/response.interceptor';

// Pipes
export { ZodValidationPipe } from './pipes/zod-validation.pipe';

// Security
export {
  buildAllowedOriginPatterns,
  createCorsOriginValidator,
  isOriginAllowed,
} from './security/cors-origin';

// Config
export { validateEnv } from './config/env';
