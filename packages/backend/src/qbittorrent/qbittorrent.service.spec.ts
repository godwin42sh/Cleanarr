import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { QbittorrentService } from './qbittorrent.service';
import type { QbittorrentConfig } from '../config/configuration';

const config: QbittorrentConfig = {
  url: 'http://qb.local',
  username: 'admin',
  password: 'secret',
};

const makeService = (): QbittorrentService =>
  new QbittorrentService({ getOrThrow: () => config } as unknown as ConfigService);

const loginOk = (): Response =>
  ({
    ok: true,
    status: 200,
    text: async () => 'Ok.',
    headers: { get: () => 'SID=abc123; HttpOnly' },
  }) as unknown as Response;

const json = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

describe('QbittorrentService', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('logs in and fetches torrents with the session cookie', async () => {
    fetchMock.mockResolvedValueOnce(loginOk()).mockResolvedValueOnce(json([{ hash: 'h1' }]));

    const torrents = await makeService().getTorrents();

    expect(torrents).toEqual([{ hash: 'h1' }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, infoInit] = fetchMock.mock.calls[1];
    expect(infoInit.headers.Cookie).toBe('SID=abc123');
  });

  it('reuses the session for subsequent requests', async () => {
    fetchMock
      .mockResolvedValueOnce(loginOk())
      .mockResolvedValueOnce(json([]))
      .mockResolvedValueOnce(json([]));

    const service = makeService();
    await service.getTorrents();
    await service.getTorrents();

    // 1 login + 2 info calls.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('re-authenticates once on a 403 and retries', async () => {
    fetchMock
      .mockResolvedValueOnce(loginOk())
      .mockResolvedValueOnce({ ok: false, status: 403 } as Response)
      .mockResolvedValueOnce(loginOk())
      .mockResolvedValueOnce(json([{ hash: 'h2' }]));

    const torrents = await makeService().getTorrents();
    expect(torrents).toEqual([{ hash: 'h2' }]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('throws when credentials are rejected', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => 'Fails.',
      headers: { get: () => null },
    } as unknown as Response);

    await expect(makeService().getTorrents()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('surfaces a connection failure as ServiceUnavailable', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(makeService().getTorrents()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('sends a pipe-joined delete request', async () => {
    fetchMock.mockResolvedValueOnce(loginOk()).mockResolvedValueOnce(json(''));

    await makeService().deleteTorrents(['a', 'b'], true);

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('http://qb.local/api/v2/torrents/delete');
    expect(init.body.toString()).toContain('hashes=a%7Cb');
    expect(init.body.toString()).toContain('deleteFiles=true');
  });

  it('does not call the API when deleting an empty hash list', async () => {
    await makeService().deleteTorrents([], true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
