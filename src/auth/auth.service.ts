import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';

export interface SupabaseJwtPayload {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  email?: string;
  phone?: string;
  app_metadata?: any;
  user_metadata?: any;
  role?: string;
  aal?: string;
  amr?: any[];
  session_id?: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    role?: string;
  };
  accessToken: string;
}

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'SUPABASE_URL e SUPABASE_ANON_KEY devem estar configuradas',
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  /**
   * Valida um JWT token do Supabase
   * @param token - O token JWT do Supabase
   * @param supabaseJwtSecret - A chave secreta JWT do Supabase
   * @returns O payload decodificado se válido
   */
  async validateSupabaseToken(
    token: string,
    supabaseJwtSecret: string,
  ): Promise<SupabaseJwtPayload> {
    try {
      // Verificar e decodificar o token usando a chave secreta do Supabase
      const decoded = jwt.verify(token, supabaseJwtSecret, {
        algorithms: ['HS256'],
      }) as SupabaseJwtPayload;

      return decoded;
    } catch (error) {
      throw new Error(`Token inválido: ${error.message}`);
    }
  }

  /**
   * Extrai informações do usuário do payload do JWT
   * @param payload - O payload decodificado do JWT
   * @returns Informações simplificadas do usuário
   */
  extractUserInfo(payload: SupabaseJwtPayload) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      aud: payload.aud,
    };
  }

  /**
   * Realiza login do usuário com email e senha
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new UnauthorizedException(error.message);
      }

      if (!data.user || !data.session) {
        throw new UnauthorizedException('Credenciais inválidas');
      }

      return {
        user: {
          id: data.user.id,
          email: data.user.email!,
          role: data.user.role,
        },
        accessToken: data.session.access_token,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Erro ao realizar login');
    }
  }
}
