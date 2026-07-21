import { Test } from '@nestjs/testing';
import { CleanupController } from './cleanup.controller';
import { CleanupService } from './cleanup.service';
import type { CleanupCandidate, CleanupSummary } from './cleanup.types';

describe('CleanupController', () => {
  let controller: CleanupController;
  const service = {
    getStoredCandidates: jest.fn(),
    scanAndStore: jest.fn(),
    clean: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [CleanupController],
      providers: [{ provide: CleanupService, useValue: service }],
    }).compile();
    controller = moduleRef.get(CleanupController);
  });

  it('GET /files/unused returns stored candidates', async () => {
    const candidates: CleanupCandidate[] = [];
    service.getStoredCandidates.mockResolvedValue(candidates);
    expect(await controller.getUnused()).toBe(candidates);
  });

  it('POST /files/scan triggers a manual scan', async () => {
    const candidates: CleanupCandidate[] = [];
    service.scanAndStore.mockResolvedValue(candidates);
    expect(await controller.scan()).toBe(candidates);
    expect(service.scanAndStore).toHaveBeenCalledWith('MANUAL');
  });

  it('POST /files/clean forwards files and defaults deleteFiles to true', async () => {
    const summary = {} as CleanupSummary;
    service.clean.mockResolvedValue(summary);

    await controller.clean({ files: ['/a.mkv'] });

    expect(service.clean).toHaveBeenCalledWith(['/a.mkv'], true);
  });

  it('POST /files/clean honours an explicit deleteFiles=false', async () => {
    service.clean.mockResolvedValue({} as CleanupSummary);

    await controller.clean({ files: ['/a.mkv'], deleteFiles: false });

    expect(service.clean).toHaveBeenCalledWith(['/a.mkv'], false);
  });
});
