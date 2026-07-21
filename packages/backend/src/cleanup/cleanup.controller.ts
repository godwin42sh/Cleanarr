import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { CleanRequestDto } from './dto/clean-request.dto';
import type { CleanupCandidate, CleanupSummary } from './cleanup.types';

@Controller('files')
export class CleanupController {
  constructor(private readonly cleanup: CleanupService) {}

  /**
   * GET /files/unused
   * Return the candidates stored by the most recent scan (cron or manual).
   */
  @Get('unused')
  getUnused(): Promise<CleanupCandidate[]> {
    return this.cleanup.getStoredCandidates();
  }

  /**
   * POST /files/scan
   * Trigger a fresh scan now, persist the results, and return them.
   */
  @Post('scan')
  @HttpCode(HttpStatus.OK)
  scan(): Promise<CleanupCandidate[]> {
    return this.cleanup.scanAndStore('MANUAL');
  }

  /**
   * POST /files/clean
   * Manually clean the provided files by removing the matching torrents from
   * qBittorrent and deleting orphaned files from disk.
   */
  @Post('clean')
  @HttpCode(HttpStatus.OK)
  clean(@Body() dto: CleanRequestDto): Promise<CleanupSummary> {
    return this.cleanup.clean(dto.files, dto.deleteFiles ?? true);
  }
}
