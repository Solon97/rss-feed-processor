import { Injectable } from '@nestjs/common';
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

@Injectable()
export class AuthService {
  constructor() {}

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
}
