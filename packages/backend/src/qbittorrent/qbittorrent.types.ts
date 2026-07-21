/** Subset of the torrent object returned by GET /api/v2/torrents/info. */
export interface QbTorrentInfo {
  hash: string;
  name: string;
  content_path: string;
  save_path: string;
  category: string;
  tags: string;
  size: number;
}
