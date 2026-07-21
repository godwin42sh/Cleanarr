import { ArrayNotEmpty, IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CleanRequestDto {
  /** Absolute paths of the unused files to clean. */
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  files!: string[];

  /**
   * When true (default) the downloaded data is removed from disk along with
   * the torrent. Set to false to only remove the torrent entry.
   */
  @IsOptional()
  @IsBoolean()
  deleteFiles?: boolean;
}
