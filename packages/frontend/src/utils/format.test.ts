import { describe, expect, it } from 'vitest';
import { formatAge, formatSize } from './format';

describe('formatSize', () => {
  it('formats bytes', () => {
    expect(formatSize(0)).toBe('0 B');
    expect(formatSize(512)).toBe('512 B');
  });

  it('formats larger units with one decimal', () => {
    expect(formatSize(1536)).toBe('1.5 KB');
    expect(formatSize(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatSize(2 * 1024 * 1024 * 1024)).toBe('2.0 GB');
  });

  it('drops the decimal for values >= 100', () => {
    expect(formatSize(250 * 1024 * 1024)).toBe('250 MB');
  });
});

describe('formatAge', () => {
  it('handles singular and plural', () => {
    expect(formatAge(1)).toBe('1 day');
    expect(formatAge(9)).toBe('9 days');
  });
});
