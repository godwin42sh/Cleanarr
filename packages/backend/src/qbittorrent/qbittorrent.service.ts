import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { QbittorrentConfig } from '../config/configuration';
import type { QbTorrentInfo } from './qbittorrent.types';

/**
 * Thin client for the qBittorrent WebUI API (v2). Handles cookie-based
 * authentication and transparently re-authenticates on session expiry.
 *
 * @see https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)
 */
@Injectable()
export class QbittorrentService {
  private readonly logger = new Logger(QbittorrentService.name);
  private readonly config: QbittorrentConfig;
  private sid: string | null = null;

  constructor(configService: ConfigService) {
    this.config = configService.getOrThrow<QbittorrentConfig>('qbittorrent');
  }

  /** Fetch every torrent qBittorrent knows about. */
  async getTorrents(): Promise<QbTorrentInfo[]> {
    const res = await this.request('/api/v2/torrents/info');
    return (await res.json()) as QbTorrentInfo[];
  }

  /**
   * Delete torrents from qBittorrent.
   *
   * @param hashes torrent hashes to remove
   * @param deleteFiles when true, also removes the downloaded data from disk
   */
  async deleteTorrents(hashes: string[], deleteFiles = true): Promise<void> {
    if (hashes.length === 0) return;
    const body = new URLSearchParams({
      hashes: hashes.join('|'),
      deleteFiles: String(deleteFiles),
    });
    await this.request('/api/v2/torrents/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    this.logger.log(
      `Deleted ${hashes.length} torrent(s) from qBittorrent (deleteFiles=${deleteFiles}).`,
    );
  }

  /** Authenticate and cache the SID cookie. */
  private async login(): Promise<void> {
    const body = new URLSearchParams({
      username: this.config.username,
      password: this.config.password,
    });
    let res: Response;
    try {
      res = await fetch(`${this.config.url}/api/v2/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: this.config.url,
        },
        body,
      });
    } catch (err) {
      throw new ServiceUnavailableException(
        `Could not reach qBittorrent at ${this.config.url}: ${(err as Error).message}`,
      );
    }

    if (!res.ok) {
      throw new ServiceUnavailableException(`qBittorrent login failed with status ${res.status}`);
    }

    const text = await res.text();
    if (text.trim() !== 'Ok.') {
      throw new ServiceUnavailableException('qBittorrent rejected the provided credentials');
    }

    const cookie = res.headers.get('set-cookie');
    const match = cookie?.match(/SID=([^;]+)/);
    if (!match) {
      throw new ServiceUnavailableException('qBittorrent did not return a session cookie');
    }
    this.sid = match[1];
  }

  /**
   * Perform an authenticated request, logging in on first use and retrying
   * once if the session has expired (403).
   */
  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    if (!this.sid) {
      await this.login();
    }

    const doFetch = (): Promise<Response> =>
      fetch(`${this.config.url}${path}`, {
        ...init,
        headers: {
          ...init.headers,
          Cookie: `SID=${this.sid}`,
          Referer: this.config.url,
        },
      });

    let res: Response;
    try {
      res = await doFetch();
    } catch (err) {
      throw new ServiceUnavailableException(
        `Could not reach qBittorrent at ${this.config.url}: ${(err as Error).message}`,
      );
    }

    if (res.status === 403) {
      this.logger.warn('qBittorrent session expired, re-authenticating.');
      this.sid = null;
      await this.login();
      res = await doFetch();
    }

    if (!res.ok) {
      throw new ServiceUnavailableException(
        `qBittorrent request to ${path} failed with status ${res.status}`,
      );
    }
    return res;
  }
}
