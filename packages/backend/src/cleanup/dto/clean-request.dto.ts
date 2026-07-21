import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CleanRequestDto {
  @ApiProperty({
    type: [String],
    description: 'Absolute paths of the unused files to clean.',
    example: ['/mnt/Nas/Media/Movies/.downloads/Movie.2024.mkv'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  files!: string[];

  @ApiPropertyOptional({
    default: true,
    description:
      'When true (default) the downloaded data is removed from disk along with the torrent. Set to false to only remove the torrent entry.',
  })
  @IsOptional()
  @IsBoolean()
  deleteFiles?: boolean;
}
