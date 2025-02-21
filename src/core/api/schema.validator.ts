import Joi from 'joi';
import logger from '../logger';

/**
 * Schema validation options
 */
export interface SchemaValidationOptions {
  abortEarly?: boolean;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
}

/**
 * Schema validation result
 */
export interface SchemaValidationResult<T> {
  isValid: boolean;
  value: T;
  error?: Joi.ValidationError;
}

/**
 * Schema validator class for API responses
 */
export class SchemaValidator {
  private static defaultOptions: SchemaValidationOptions = {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: false,
  };

  /**
   * Validate data against schema
   */
  public static validate<T>(
    data: any,
    schema: Joi.Schema,
    options: SchemaValidationOptions = {},
  ): SchemaValidationResult<T> {
    const validationOptions = { ...this.defaultOptions, ...options };

    try {
      const result = schema.validate(data, validationOptions);
      const isValid = !result.error;

      if (!isValid) {
        logger.warn('Schema validation failed', {
          errors: result.error?.details,
          data,
        });
      }

      return {
        isValid,
        value: result.value as T,
        error: result.error,
      };
    } catch (error) {
      logger.logError('Schema validation error', error);
      return {
        isValid: false,
        value: data as T,
        error: error as Joi.ValidationError,
      };
    }
  }

  /**
   * Create schema from type
   */
  public static createSchema<T>(schemaDefinition: Joi.SchemaMap): Joi.ObjectSchema<T> {
    return Joi.object<T>(schemaDefinition);
  }

  /**
   * Get validation error messages
   */
  public static getErrorMessages(error?: Joi.ValidationError): string[] {
    if (!error || !error.details) {
      return [];
    }

    return error.details.map((detail) => detail.message);
  }

  /**
   * Format validation error
   */
  public static formatError(error?: Joi.ValidationError): Record<string, string[]> {
    if (!error || !error.details) {
      return {};
    }

    const formattedErrors: Record<string, string[]> = {};

    error.details.forEach((detail) => {
      const path = detail.path.join('.');
      if (!formattedErrors[path]) {
        formattedErrors[path] = [];
      }
      formattedErrors[path].push(detail.message);
    });

    return formattedErrors;
  }
}
