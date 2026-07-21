import { Module } from '@nestjs/common';
import { ScannerModule } from '../scanner/scanner.module';
import { QbittorrentModule } from '../qbittorrent/qbittorrent.module';
import { CleanupService } from './cleanup.service';
import { CleanupController } from './cleanup.controller';
import { CleanupCron } from './cleanup.cron';
import { CandidateStore } from './candidate.store';

@Module({
  imports: [ScannerModule, QbittorrentModule],
  controllers: [CleanupController],
  providers: [CleanupService, CleanupCron, CandidateStore],
  exports: [CleanupService],
})
export class CleanupModule {}
