import {
  ValidationPipe,
  ValidationError,
  BadRequestException,
} from '@nestjs/common';

export class CustomValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        const formatErrors = (errors: ValidationError[]): any => {
          return errors.reduce((acc, error) => {
            if (error.children && error.children.length > 0) {
              acc[error.property] = formatErrors(error.children);
            } else {
              acc[error.property] = Object.values(error.constraints || {});
            }
            return acc;
          }, {} as any);
        };

        const formattedErrors = formatErrors(validationErrors);

        throw new BadRequestException({
          error: 'VALIDATION_ERROR',
          message: 'Dados de entrada inválidos',
          details: formattedErrors,
        });
      },
    });
  }
}
