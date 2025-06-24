import { applyDecorators, UseGuards } from '@nestjs/common';
import { AppAuthGuard } from '../guards/auth.guard';

/**
 * Decorator for protecting routes with access token validation
 * Use this for standard authenticated routes
 */
export const Authenticated = () => applyDecorators(UseGuards(AppAuthGuard));
