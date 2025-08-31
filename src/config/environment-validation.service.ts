import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ServiceEnvironmentConfig {
  name: string;
  description: string;
  requiredVars: string[];
  optionalVars?: string[];
  enabled?: boolean; // Para permitir desabilitar serviços temporariamente
}

@Injectable()
export class EnvironmentValidationService {
  private readonly logger = new Logger(EnvironmentValidationService.name);

  private readonly serviceConfigs: ServiceEnvironmentConfig[] = [
    {
      name: 'Supabase',
      description: 'Serviço de autenticação e banco de dados',
      requiredVars: [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SUPABASE_JWT_SECRET',
      ],
      enabled: true,
    },
    {
      name: 'PostgreSQL',
      description: 'Banco de dados PostgreSQL e sistema de filas',
      requiredVars: ['DATABASE_URL'],
      enabled: true,
    },
    {
      name: 'Youtube',
      description: 'Serviço de integração com o YouTube',
      requiredVars: ['YOUTUBE_API_KEY'],
      enabled: true,
    },
    {
      name: 'Stripe',
      description: 'Serviço de pagamentos e assinaturas',
      requiredVars: [
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'STRIPE_MONTHLY_PRICE_ID',
        'STRIPE_YEARLY_PRICE_ID',
      ],
      enabled: true,
    },
    {
      name: 'Resend',
      description: 'Serviço de envio de emails',
      requiredVars: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL'],
      optionalVars: ['FRONTEND_URL'],
      enabled: true,
    },
    {
      name: 'Cron System',
      description: 'Agendamento de tarefas',
      requiredVars: ['FEED_PROCESSING_CRON', 'QUEUE_HEALTH_CHECK_CRON'],
      enabled: true,
    },
  ];

  constructor(private readonly configService: ConfigService) {}

  /**
   * Valida todas as variáveis de ambiente dos serviços habilitados
   * @returns true se todas as validações passaram, false caso contrário
   */
  validateEnvironment(): boolean {
    this.logger.log('🔍 Iniciando validação das variáveis de ambiente...');

    const enabledServices = this.serviceConfigs.filter(
      (service) => service.enabled !== false,
    );

    let allValid = true;
    const validationResults: Array<{
      service: string;
      valid: boolean;
      missingVars: string[];
      presentVars: string[];
    }> = [];

    for (const service of enabledServices) {
      const result = this.validateService(service);
      validationResults.push(result);

      if (!result.valid) {
        allValid = false;
      }
    }

    this.logValidationResults(validationResults);

    if (!allValid) {
      this.logger.error(
        '❌ Algumas variáveis de ambiente obrigatórias não estão configuradas!',
      );
    } else {
      this.logger.log(
        '✅ Todas as variáveis de ambiente estão configuradas corretamente!',
      );
    }

    return allValid;
  }

  /**
   * Valida as variáveis de ambiente de um serviço específico
   */
  private validateService(service: ServiceEnvironmentConfig) {
    const missingVars: string[] = [];
    const presentVars: string[] = [];

    for (const varName of service.requiredVars) {
      const value = this.configService.get(varName);
      if (!value || value.toString().trim() === '') {
        missingVars.push(varName);
      } else {
        presentVars.push(varName);
      }
    }

    return {
      service: service.name,
      valid: missingVars.length === 0,
      missingVars,
      presentVars,
    };
  }

  /**
   * Registra os resultados da validação nos logs
   */
  private logValidationResults(
    results: Array<{
      service: string;
      valid: boolean;
      missingVars: string[];
      presentVars: string[];
    }>,
  ): void {
    this.logger.log('📊 Resultados da validação por serviço:');

    for (const result of results) {
      const service = this.serviceConfigs.find(
        (s) => s.name === result.service,
      );
      const status = result.valid ? '✅' : '❌';

      this.logger.log(`${status} ${result.service} - ${service?.description}`);

      if (result.presentVars.length > 0) {
        this.logger.log(`   ✓ Configuradas: ${result.presentVars.join(', ')}`);
      }

      if (result.missingVars.length > 0) {
        this.logger.warn(`   ✗ Faltando: ${result.missingVars.join(', ')}`);
      }
    }
  }

  /**
   * Obtém a configuração de um serviço específico
   */
  getServiceConfig(serviceName: string): ServiceEnvironmentConfig | undefined {
    return this.serviceConfigs.find(
      (service) => service.name.toLowerCase() === serviceName.toLowerCase(),
    );
  }

  /**
   * Lista todos os serviços configurados
   */
  getAllServices(): ServiceEnvironmentConfig[] {
    return [...this.serviceConfigs];
  }

  /**
   * Adiciona um novo serviço à validação (útil para plugins ou módulos externos)
   */
  addService(serviceConfig: ServiceEnvironmentConfig): void {
    const existingIndex = this.serviceConfigs.findIndex(
      (service) =>
        service.name.toLowerCase() === serviceConfig.name.toLowerCase(),
    );

    if (existingIndex >= 0) {
      this.serviceConfigs[existingIndex] = serviceConfig;
      this.logger.log(
        `🔄 Configuração do serviço '${serviceConfig.name}' atualizada`,
      );
    } else {
      this.serviceConfigs.push(serviceConfig);
      this.logger.log(`➕ Novo serviço '${serviceConfig.name}' adicionado`);
    }
  }

  /**
   * Remove um serviço da validação
   */
  removeService(serviceName: string): boolean {
    const index = this.serviceConfigs.findIndex(
      (service) => service.name.toLowerCase() === serviceName.toLowerCase(),
    );

    if (index >= 0) {
      this.serviceConfigs.splice(index, 1);
      this.logger.log(`➖ Serviço '${serviceName}' removido`);
      return true;
    }

    return false;
  }

  /**
   * Habilita ou desabilita um serviço
   */
  toggleService(serviceName: string, enabled: boolean): boolean {
    const service = this.serviceConfigs.find(
      (s) => s.name.toLowerCase() === serviceName.toLowerCase(),
    );

    if (service) {
      service.enabled = enabled;
      const status = enabled ? 'habilitado' : 'desabilitado';
      this.logger.log(`🔀 Serviço '${serviceName}' ${status}`);
      return true;
    }

    return false;
  }
}
