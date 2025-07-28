import { Body, Controller, Post, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/auth.dto';
import { RegisterDto } from './dto/register.dto';
import { ConfigService } from '@nestjs/config';

interface AuthResponse {
  user: {
    id: string;
    email: string;
    role?: string;
  };
  accessToken: string;
}

interface RegisterResponse {
  message: string;
  needsConfirmation: boolean;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<RegisterResponse> {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.name,
    );
  }

  @Get('confirm')
  async confirmEmail(
    @Query('token_hash') tokenHash: string,
    @Query('type') type: string = 'email',
    @Res() res: Response,
  ): Promise<void> {
    try {
      if (!tokenHash) {
        res.status(400).json({
          error: 'Token de confirmação não fornecido',
        });
        return;
      }

      const authResult = await this.authService.confirmEmail(tokenHash, type);

      // Redirecionar para o frontend com token de acesso
      const frontendUrl =
        this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
      const redirectUrl = `${frontendUrl}?token=${authResult.accessToken}&confirmed=true`;

      res.redirect(redirectUrl);
    } catch (error) {
      // Em caso de erro, redirecionar para o frontend com parâmetro de erro
      const frontendUrl =
        this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
      const errorMessage = encodeURIComponent(
        error.message || 'Erro ao confirmar email',
      );
      const redirectUrl = `${frontendUrl}?error=${errorMessage}`;

      res.redirect(redirectUrl);
    }
  }
}
