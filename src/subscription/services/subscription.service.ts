import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserSubscriptionResponseDto } from '../dto/subscription.dto';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca todas as inscrições de um usuário específico
   * @param userId - ID do usuário
   * @returns Array de inscrições do usuário
   */
  async findByUserId(userId: string): Promise<UserSubscriptionResponseDto[]> {
    try {
      const subscriptions = await this.prisma.user_subscriptions.findMany({
        select: {
          id: true,
          user_id: true,
          status: true,
          current_period_start: true,
          current_period_end: true,
        },
        where: {
          user_id: userId,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      if (!subscriptions || subscriptions.length === 0) {
        return [];
      }

      return subscriptions;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Erro ao buscar inscrições do usuário: ${error.message}`);
    }
  }

  /**
   * Busca a inscrição ativa de um usuário
   * @param userId - ID do usuário
   * @returns Inscrição ativa do usuário ou null se não encontrada
   */
  async findActiveByUserId(
    userId: string,
  ): Promise<UserSubscriptionResponseDto> {
    const isStripeEnabled = process.env.ENABLE_STRIPE === 'true';

    if (!isStripeEnabled) {
      const currentDate = new Date();
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(currentDate.getFullYear() + 1);
      return {
        status: 'active',
        user_id: userId,
        current_period_start: currentDate,
        current_period_end: oneYearFromNow,
      };
    }

    const activeSubscription = await this.prisma.user_subscriptions.findFirst({
      select: {
        id: true,
        user_id: true,
        status: true,
        current_period_start: true,
        current_period_end: true,
      },
      where: {
        user_id: userId,
        status: {
          in: ['active', 'trialing'],
        },
        current_period_end: {
          gte: new Date(), // Verifica se ainda não expirou
        },
      },
      orderBy: {
        current_period_end: 'desc',
      },
    });

    if (!activeSubscription) {
      return {
        status: 'inactive',
        user_id: userId,
      };
    }

    return activeSubscription;
  }
}
