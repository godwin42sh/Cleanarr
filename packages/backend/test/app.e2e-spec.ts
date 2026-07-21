import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { CleanupService } from '../src/cleanup/cleanup.service';
import type { CleanupCandidate } from '../src/cleanup/cleanup.types';

describe('Cleanarr API (e2e)', () => {
  let app: INestApplication;

  const cleanupService = {
    getCandidates: jest.fn<Promise<CleanupCandidate[]>, []>(),
    clean: jest.fn(),
  };

  beforeAll(async () => {
    process.env.SCAN_DIRS = '/tmp/does-not-exist';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CleanupService)
      .useValue(cleanupService)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health', () => {
    return request(app.getHttpServer()).get('/api/health').expect(200).expect({ status: 'ok' });
  });

  it('GET /api/files/unused returns candidates', () => {
    cleanupService.getCandidates.mockResolvedValue([]);
    return request(app.getHttpServer()).get('/api/files/unused').expect(200).expect([]);
  });

  it('POST /api/files/clean rejects an empty file list', () => {
    return request(app.getHttpServer()).post('/api/files/clean').send({ files: [] }).expect(400);
  });

  it('POST /api/files/clean accepts a valid payload', () => {
    cleanupService.clean.mockResolvedValue({
      requested: 1,
      cleaned: 1,
      failed: 0,
      removedTorrentHashes: [],
      items: [],
    });
    return request(app.getHttpServer())
      .post('/api/files/clean')
      .send({ files: ['/data/a.mkv'] })
      .expect(200)
      .expect((res) => expect(res.body.cleaned).toBe(1));
  });
});
