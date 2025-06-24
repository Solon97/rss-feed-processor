import {
  Injectable,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../auth.service';

@Injectable()
export class AppAuthGuard extends AuthGuard('supabase-jwt') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    return super.canActivate(context) as boolean;
  }

  handleRequest(err: any, user: any, info: any) {
    return this.handleAccessTokenRequest(err, user, info);
  }

  private handleAccessTokenRequest(err: any, user: any, info: any) {
    if (err || !user) {
      // Invalid token format
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException({
          error: 'INVALID_TOKEN_FORMAT',
          message: 'Formato do token de autenticação inválido',
          details: 'Verifique se o token JWT está no formato correto',
          tokenType: 'access',
        });
      }

      // Expired token
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          error: 'TOKEN_EXPIRED',
          message: 'Token de autenticação expirado',
          details: 'Faça login novamente para obter um novo token',
          tokenType: 'access',
        });
      }

      // Missing token
      if (info?.message === 'No auth token') {
        throw new UnauthorizedException({
          error: 'MISSING_TOKEN',
          message: 'Token de autenticação não fornecido',
          details: 'Inclua o token Bearer no cabeçalho Authorization',
          tokenType: 'access',
        });
      }

      // Generic authentication error
      throw new UnauthorizedException({
        error: 'AUTHENTICATION_FAILED',
        message: 'Falha na autenticação',
        details: err?.message || info?.message || 'Credenciais inválidas',
        tokenType: 'access',
      });
    }

    return user;
  }
}

// Factory functions for easier usage (kept for backward compatibility)
export const createAccessTokenGuard = () => AppAuthGuard;
