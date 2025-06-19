import { IsUrl, IsNotEmpty } from 'class-validator';

export class ValidateFeedDto {
  @IsUrl(
    { require_protocol: true },
    { message: 'URL deve ser uma URL válida com protocolo (http/https)' },
  )
  @IsNotEmpty({ message: 'URL é obrigatória' })
  url: string;
}

export class ExtractContentDto {
  @IsUrl(
    { require_protocol: true },
    { message: 'URL deve ser uma URL válida com protocolo (http/https)' },
  )
  @IsNotEmpty({ message: 'URL é obrigatória' })
  url: string;
}
