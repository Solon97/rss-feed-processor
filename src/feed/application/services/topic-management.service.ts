import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FeedProcessingException } from '../../../common/exceptions/feed.exceptions';
import { TopicResponseDto } from '../../dto/topic.dto';

export class TopicAlreadyExistsException extends Error {
  constructor(topicName: string) {
    super(`Tópico '${topicName}' já existe para este usuário`);
    this.name = 'TopicAlreadyExistsException';
  }
}

export class TopicNotFoundException extends Error {
  constructor(topicId: string) {
    super(`Tópico com ID ${topicId} não encontrado`);
    this.name = 'TopicNotFoundException';
  }
}

export class TopicHasActiveFeedsException extends Error {
  constructor(topicName: string, feedCount: number) {
    super(
      `Não é possível excluir o tópico '${topicName}' pois ele possui ${feedCount} feed(s) relacionado(s). Remova os feeds primeiro.`,
    );
    this.name = 'TopicHasActiveFeedsException';
  }
}

/**
 * Service for Topic Management
 * Handles CRUD operations for user topics
 */
@Injectable()
export class TopicManagementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new topic for a user
   */
  async createTopic(
    userId: string,
    name: string,
    color?: string,
  ): Promise<TopicResponseDto> {
    try {
      // Check if topic with same name already exists for this user
      const existingTopic = await this.prisma.topics.findUnique({
        where: {
          user_id_name: {
            user_id: userId,
            name: name,
          },
        },
      });

      if (existingTopic) {
        throw new TopicAlreadyExistsException(name);
      }

      const topic = await this.prisma.topics.create({
        data: {
          user_id: userId,
          name: name,
          color: color || null,
        },
      });

      return {
        id: topic.id,
        name: topic.name,
        color: topic.color,
        created_at: topic.created_at.toISOString(),
        updated_at: topic.updated_at.toISOString(),
      };
    } catch (error) {
      if (error instanceof TopicAlreadyExistsException) {
        throw error;
      }
      throw new FeedProcessingException('criação de tópico', error.message);
    }
  }

  /**
   * Gets all topics for a specific user
   */
  async getUserTopics(
    userId: string,
    hasActiveFeeds: boolean,
  ): Promise<TopicResponseDto[]> {
    try {
      const topics = await this.prisma.topics.findMany({
        where: {
          user_id: userId,
          ...(hasActiveFeeds && {
            user_feeds: {
              some: { is_active: true },
            },
          }),
        },
        orderBy: { created_at: 'desc' },
        include: {
          user_feeds: true,
        },
      });

      return topics.map((topic) => ({
        id: topic.id,
        name: topic.name,
        color: topic.color,
        created_at: topic.created_at.toISOString(),
        updated_at: topic.updated_at.toISOString(),
      }));
    } catch (error) {
      throw new FeedProcessingException('busca de tópicos', error.message);
    }
  }

  /**
   * Validates if a topic exists and belongs to the user
   */
  async validateTopicOwnership(
    userId: string,
    topicId: string,
  ): Promise<boolean> {
    try {
      const topic = await this.prisma.topics.findFirst({
        where: {
          id: topicId,
          user_id: userId,
        },
      });

      return !!topic;
    } catch (error) {
      throw new FeedProcessingException(
        'validação de propriedade do tópico',
        error.message,
      );
    }
  }

  /**
   * Deletes a topic after validating it has no related feeds
   */
  async deleteTopic(userId: string, topicId: string): Promise<void> {
    try {
      // First, find the topic and verify ownership
      const topic = await this.prisma.topics.findFirst({
        where: {
          id: topicId,
          user_id: userId,
        },
        include: {
          user_feeds: true,
        },
      });

      if (!topic) {
        throw new TopicNotFoundException(topicId);
      }

      // Check if topic has any related feeds
      if (topic.user_feeds.length > 0) {
        throw new TopicHasActiveFeedsException(
          topic.name,
          topic.user_feeds.length,
        );
      }

      // Delete the topic
      await this.prisma.topics.delete({
        where: {
          id: topicId,
        },
      });
    } catch (error) {
      if (
        error instanceof TopicNotFoundException ||
        error instanceof TopicHasActiveFeedsException
      ) {
        throw error;
      }
      throw new FeedProcessingException('exclusão de tópico', error.message);
    }
  }
}
