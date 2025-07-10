import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EnvironmentValidationService } from './environment-validation.service';

@Module({
  imports: [ConfigModule],
  providers: [EnvironmentValidationService],
  exports: [EnvironmentValidationService],
})
export class ConfigurationModule {}
