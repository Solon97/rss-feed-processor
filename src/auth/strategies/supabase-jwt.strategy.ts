import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
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
    const jwksUri = configService.get<string>('SUPABASE_JWKS_URL');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['ES256'],
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        jwksUri,
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
      }) as any,
      // issuer: configService.get('SUPABASE_JWT_ISSUER'),
      // audience: configService.get('SUPABASE_JWT_AUDIENCE') ?? undefined,
    });
  }

  async validate(payload: SupabaseJwtPayload) {
    try {
      return this.authService.extractUserInfo(payload);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException({
        error: 'INVALID_TOKEN',
        message: 'Token de autenticação inválido',
        details: 'Verifique se o token está correto e não foi alterado',
      });
    }
  }
}
