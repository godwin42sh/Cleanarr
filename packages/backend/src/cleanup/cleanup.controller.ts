import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { CleanRequestDto } from './dto/clean-request.dto';
import type { CleanupCandidate, CleanupSummary } from './cleanup.types';

@Controller('files')
export class CleanupController {
  constructor(private readonly cleanup: CleanupService) {}

  /**
   * GET /files/unused
   * Return the current list of cleanup candidates (unused, unlinked files
   * matched to their qBittorrent torrents).
   */
  @Get('unused')
  getUnused(): Promise<CleanupCandidate[]> {
    return this.cleanup.getCandidates();
  }

  /**
   * POST /files/clean
   * Clean the provided list of files by removing the matching torrents from
   * qBittorrent and deleting orphaned files from disk.
   */
  @Post('clean')
  @HttpCode(HttpStatus.OK)
  clean(@Body() dto: CleanRequestDto): Promise<CleanupSummary> {
    return this.cleanup.clean(dto.files, dto.deleteFiles ?? true);
  }
}
