import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScannedFileDto {
  @ApiProperty({ description: 'Absolute path to the file.' })
  path!: string;

  @ApiProperty({ description: 'File size in bytes.' })
  sizeBytes!: number;

  @ApiProperty({ description: 'Age in whole days, based on mtime.' })
  ageDays!: number;

  @ApiProperty({ description: 'Hardlink count. 1 = unused; > 1 = still in use.' })
  links!: number;
}

export class MatchedTorrentDto {
  @ApiProperty()
  hash!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ description: 'Path qBittorrent reports as the torrent content root.' })
  contentPath!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiProperty()
  sizeBytes!: number;
}

export class CleanupCandidateDto {
  @ApiProperty({ description: 'Stable identifier (the shared content path).' })
  id!: string;

  @ApiProperty({ type: [ScannedFileDto] })
  files!: ScannedFileDto[];

  @ApiProperty({ type: [MatchedTorrentDto], description: 'length > 1 means cross-seed.' })
  torrents!: MatchedTorrentDto[];

  @ApiProperty()
  crossSeed!: boolean;

  @ApiProperty()
  totalSizeBytes!: number;

  @ApiProperty()
  ageDays!: number;
}

export class CleanupResultItemDto {
  @ApiProperty()
  path!: string;

  @ApiProperty({ type: [String] })
  removedTorrents!: string[];

  @ApiProperty()
  deletedFromDisk!: boolean;

  @ApiPropertyOptional()
  error?: string;
}

export class CleanupSummaryDto {
  @ApiProperty()
  requested!: number;

  @ApiProperty()
  cleaned!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty({ type: [String] })
  removedTorrentHashes!: string[];

  @ApiProperty({ type: [CleanupResultItemDto] })
  items!: CleanupResultItemDto[];
}
