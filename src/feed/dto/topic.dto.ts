import {
  IsHexColor,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTopicDto {
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(1, { message: 'Nome deve ter pelo menos 1 caractere' })
  @MaxLength(50, { message: 'Nome deve ter no máximo 50 caracteres' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Cor deve ser uma string' })
  @IsHexColor({
    message: 'Cor deve ser um código hexadecimal válido (ex: #FF5733)',
  })
  color?: string;
}

export interface TopicResponseDto {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}
