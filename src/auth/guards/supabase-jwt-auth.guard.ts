import {
  Injectable,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class SupabaseJwtAuthGuard extends AuthGuard('supabase-jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // Se há um erro ou não há usuário
    if (err || !user) {
      // Verifica se não há token de autenticação
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException({
          error: 'INVALID_TOKEN_FORMAT',
          message: 'Formato do token de autenticação inválido',
          details: 'Verifique se o token JWT está no formato correto',
        });
      }

      // Token expirado
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          error: 'TOKEN_EXPIRED',
          message: 'Token de autenticação expirado',
          details: 'Faça login novamente para obter um novo token',
        });
      }

      // Nenhum token fornecido
      if (info?.message === 'No auth token') {
        throw new UnauthorizedException({
          error: 'MISSING_TOKEN',
          message: 'Token de autenticação não fornecido',
          details: 'Inclua o token Bearer no cabeçalho Authorization',
        });
      }

      // Erro genérico de autenticação
      throw new UnauthorizedException({
        error: 'AUTHENTICATION_FAILED',
        message: 'Falha na autenticação',
        details: err?.message || info?.message || 'Credenciais inválidas',
      });
    }

    return user;
  }
}
