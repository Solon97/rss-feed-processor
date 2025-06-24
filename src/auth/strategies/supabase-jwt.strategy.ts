import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService, SupabaseJwtPayload } from '../auth.service';

@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(
  Strategy,
  'supabase-jwt',
) {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    const secret = configService.get<string>('SUPABASE_JWT_SECRET');

    if (!secret) {
      throw new Error('SUPABASE_JWT_SECRET não está configurada');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: SupabaseJwtPayload) {
    try {
      // Extrair informações do usuário do payload
      const userInfo = this.authService.extractUserInfo(payload);

      // Verificar se o token não expirou (verificação adicional)
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new UnauthorizedException({
          error: 'TOKEN_EXPIRED',
          message: 'Token de autenticação expirado',
          details: 'Faça login novamente para obter um novo token',
        });
      }

      return userInfo;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException({
        error: 'INVALID_TOKEN',
        message: 'Token de autenticação inválido',
        details: 'Verifique se o token está correto e não foi alterado',
      });
    }
  }
}
