import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CleanupService } from './cleanup.service';
import { CleanRequestDto } from './dto/clean-request.dto';
import { CleanupCandidateDto, CleanupSummaryDto } from './dto/cleanup-response.dto';
import type { CleanupCandidate, CleanupSummary } from './cleanup.types';

@ApiTags('files')
@Controller('files')
export class CleanupController {
  constructor(private readonly cleanup: CleanupService) {}

  @Get('unused')
  @ApiOperation({
    operationId: 'getUnusedFiles',
    summary: 'List the cleanup candidates stored by the most recent scan.',
  })
  @ApiOkResponse({ type: [CleanupCandidateDto] })
  getUnused(): Promise<CleanupCandidate[]> {
    return this.cleanup.getStoredCandidates();
  }

  @Post('scan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'scanFiles',
    summary: 'Trigger a fresh scan now, persist the results, and return them.',
  })
  @ApiOkResponse({ type: [CleanupCandidateDto] })
  scan(): Promise<CleanupCandidate[]> {
    return this.cleanup.scanAndStore('MANUAL');
  }

  @Post('clean')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'cleanFiles',
    summary: 'Clean the given files: remove matching torrents and delete orphans.',
  })
  @ApiOkResponse({ type: CleanupSummaryDto })
  clean(@Body() dto: CleanRequestDto): Promise<CleanupSummary> {
    return this.cleanup.clean(dto.files, dto.deleteFiles ?? true);
  }
}
