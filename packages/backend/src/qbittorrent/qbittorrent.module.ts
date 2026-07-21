import { Module } from '@nestjs/common';
import { QbittorrentService } from './qbittorrent.service';

@Module({
  providers: [QbittorrentService],
  exports: [QbittorrentService],
})
export class QbittorrentModule {}
