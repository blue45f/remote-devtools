import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthController } from './auth.controller';

import type { AuthService } from './auth.service';

describe('AuthController', () => {
  let originalEnv: string | undefined;
  let mockAuth: {
    enabled: boolean;
    issueDevToken: ReturnType<typeof vi.fn>;
  };
  let controller: AuthController;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    mockAuth = {
      enabled: true,
      issueDevToken: vi.fn().mockReturnValue('signed.jwt.token'),
    };
    controller = new AuthController(mockAuth as unknown as AuthService);
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnv;
    vi.clearAllMocks();
  });

  describe('status', () => {
    it('returns { enabled: true } when auth service is enabled', () => {
      mockAuth.enabled = true;
      expect(controller.status()).toEqual({ enabled: true });
    });

    it('returns { enabled: false } when auth service is disabled', () => {
      mockAuth.enabled = false;
      expect(controller.status()).toEqual({ enabled: false });
    });
  });

  describe('issueDevToken', () => {
    it('throws ServiceUnavailableException when auth is disabled', () => {
      mockAuth.enabled = false;
      expect(() => controller.issueDevToken({})).toThrow(ServiceUnavailableException);
      expect(mockAuth.issueDevToken).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      expect(() => controller.issueDevToken({})).toThrow(BadRequestException);
      expect(mockAuth.issueDevToken).not.toHaveBeenCalled();
    });

    it("returns { token, type: 'Bearer' } with default claims when body is empty", () => {
      const result = controller.issueDevToken({});
      expect(result).toEqual({ token: 'signed.jwt.token', type: 'Bearer' });
      expect(mockAuth.issueDevToken).toHaveBeenCalledWith({
        sub: 'dev-user',
        org: 'dev-org',
        plan: 'free',
        email: undefined,
      });
    });

    it('passes through body overrides to the service', () => {
      const result = controller.issueDevToken({
        sub: 'user-42',
        org: 'example-org',
        plan: 'pro',
        email: 'alice@example.com',
      });
      expect(result).toEqual({ token: 'signed.jwt.token', type: 'Bearer' });
      expect(mockAuth.issueDevToken).toHaveBeenCalledWith({
        sub: 'user-42',
        org: 'example-org',
        plan: 'pro',
        email: 'alice@example.com',
      });
    });
  });
});
