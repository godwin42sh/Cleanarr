import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { configuration } from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { CleanupModule } from './cleanup/cleanup.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      // Support both a package-local .env and the monorepo-root .env.
      envFilePath: ['.env', '../../.env'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CleanupModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
