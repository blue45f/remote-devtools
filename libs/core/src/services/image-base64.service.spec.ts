import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { ImageBase64Service } from './image-base64.service';

import type { TestingModule } from '@nestjs/testing';

describe('ImageBase64Service', () => {
  let service: ImageBase64Service;
  const mockFetch = vi.fn();

  beforeEach(async () => {
    mockFetch.mockClear();
    vi.stubGlobal('fetch', mockFetch);
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageBase64Service],
    }).compile();
    service = module.get<ImageBase64Service>(ImageBase64Service);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const makeResponse = (
    overrides: Partial<{
      ok: boolean;
      status: number;
      bytes: Uint8Array;
      contentLength: string | null;
    }> = {},
  ) => {
    const bytes = overrides.bytes ?? new Uint8Array([137, 80, 78, 71]);
    return {
      ok: overrides.ok ?? true,
      status: overrides.status ?? 200,
      arrayBuffer: () => Promise.resolve(bytes.buffer),
      headers: {
        get: (name: string) => {
          if (name.toLowerCase() === 'content-length') {
            return overrides.contentLength ?? null;
          }
          return null;
        },
      },
    };
  };

  describe('imageToBase64', () => {
    it('should convert a public https image URL to base64', async () => {
      const imageBytes = new Uint8Array([137, 80, 78, 71]); // PNG header bytes
      mockFetch.mockResolvedValue(makeResponse({ bytes: imageBytes }));

      const result = await service.imageToBase64('https://example.com/img.png');

      expect(result).toBe(Buffer.from(imageBytes).toString('base64'));
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/img.png',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('should return empty string on HTTP error', async () => {
      mockFetch.mockResolvedValue(makeResponse({ ok: false, status: 404 }));

      const result = await service.imageToBase64('https://example.com/missing.png');

      expect(result).toBe('');
    });

    it('should return empty string on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      const result = await service.imageToBase64('https://unreachable.com/img.png');

      expect(result).toBe('');
    });

    it('should handle empty URL gracefully', async () => {
      const result = await service.imageToBase64('');

      expect(result).toBe('');
      // SSRF guard rejects the URL before fetch is called
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should reject private IP addresses (SSRF)', async () => {
      const result = await service.imageToBase64('http://192.168.1.1/img.png');

      expect(result).toBe('');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should reject loopback addresses (SSRF)', async () => {
      const result = await service.imageToBase64('http://127.0.0.1/img.png');

      expect(result).toBe('');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should reject localhost hostname (SSRF)', async () => {
      const result = await service.imageToBase64('http://localhost/img.png');

      expect(result).toBe('');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should reject AWS metadata endpoint (SSRF)', async () => {
      const result = await service.imageToBase64('http://169.254.169.254/latest/meta-data/');

      expect(result).toBe('');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should reject file:// scheme', async () => {
      const result = await service.imageToBase64('file:///etc/passwd');

      expect(result).toBe('');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should reject responses larger than the 10 MB cap (declared)', async () => {
      mockFetch.mockResolvedValue(makeResponse({ contentLength: String(11 * 1024 * 1024) }));

      const result = await service.imageToBase64('https://example.com/big.png');

      expect(result).toBe('');
    });

    it('should reject responses larger than the 10 MB cap (actual)', async () => {
      const bigBytes = new Uint8Array(11 * 1024 * 1024);
      mockFetch.mockResolvedValue(makeResponse({ bytes: bigBytes }));

      const result = await service.imageToBase64('https://example.com/huge.png');

      expect(result).toBe('');
    });
  });
});
