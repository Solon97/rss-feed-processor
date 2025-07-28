import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';
import { EmailService } from '../email/email.service';

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
  private readonly logger = new Logger(AuthService.name);
  private supabase: SupabaseClient;

  constructor(
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
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

  /**
   * Registra um novo usuário e envia email de boas-vindas
   */
  async register(
    email: string,
    password: string,
    name?: string,
  ): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || '',
          },
        },
      });

      if (error) {
        throw new BadRequestException(error.message);
      }

      if (!data.user || !data.session) {
        throw new BadRequestException('Erro ao criar conta');
      }

      // Enviar email de boas-vindas de forma assíncrona
      this.sendWelcomeEmailAsync(email, name);

      return {
        user: {
          id: data.user.id,
          email: data.user.email!,
          role: data.user.role,
        },
        accessToken: data.session.access_token,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erro ao criar conta');
    }
  }

  /**
   * Envia email de boas-vindas de forma assíncrona
   */
  private async sendWelcomeEmailAsync(
    email: string,
    name?: string,
  ): Promise<void> {
    try {
      await this.emailService.sendWelcomeEmail(email, name);
      this.logger.log(`Welcome email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}`, error);
      // Não falha o registro se o email não puder ser enviado
    }
  }
}
