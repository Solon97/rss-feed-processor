import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

interface LoginDto {
  email: string;
  password: string;
}

interface RegisterDto {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    role?: string;
  };
  accessToken: string;
  refreshToken?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(registerDto.email, registerDto.password);
  }

  @Post('logout')
  async logout(): Promise<{ message: string }> {
    await this.authService.logout();
    return { message: 'Logout realizado com sucesso' };
  }
}
