import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { getDefaultCommonInfo } from '../../utils/common-info';
import { UserInfoService } from '../user-info/user-info.service';

import { JiraService } from './jira.service';

import type { UserData } from '../webview/webview.types';
import type { TestingModule } from '@nestjs/testing';

// Mock axios
vi.mock('axios', () => {
  const mockAxiosInstance = {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  };
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
      __mockInstance: mockAxiosInstance,
    },
  };
});

describe('JiraService', () => {
  let service: JiraService;
  const mockUserInfoService = {
    getUserInfoByDeviceId: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.JIRA_HOST_URL = 'https://jira.example.com';
    process.env.JIRA_API_EMAIL = 'test@example.com';
    process.env.JIRA_API_TOKEN = 'test-token';

    const module: TestingModule = await Test.createTestingModule({
      providers: [JiraService, { provide: UserInfoService, useValue: mockUserInfoService }],
    }).compile();

    service = module.get<JiraService>(JiraService);
  });

  describe('initialization', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createTicket', () => {
    const defaultCommonInfo = getDefaultCommonInfo();
    const mockUserData: UserData = {
      commonInfo: {
        ...defaultCommonInfo,
        device: {
          ...defaultCommonInfo.device,
          deviceId: 'test-device-123',
        },
        user: {
          ...defaultCommonInfo.user,
          memberId: 'user-1',
        },
      },
      userAgent: 'test-agent',
      URL: 'https://example.com',
      webTitle: 'Example',
    };

    it('should throw when jiraProjectKey is not configured', async () => {
      mockUserInfoService.getUserInfoByDeviceId.mockResolvedValue({
        username: 'testuser',
        jiraProjectKey: null,
      });

      await expect(
        service.createTicket({
          roomName: 'Room-1',
          recordId: 1,
          userData: mockUserData,
        }),
      ).rejects.toThrow('Jira project key is not configured');
    });

    it('should throw when user info is not found', async () => {
      mockUserInfoService.getUserInfoByDeviceId.mockResolvedValue(null);

      await expect(
        service.createTicket({
          roomName: 'Room-1',
          recordId: 1,
          userData: mockUserData,
        }),
      ).rejects.toThrow();
    });
  });

  describe('uploadImageToJira', () => {
    it('should have uploadImageToJira method', () => {
      expect(service.uploadImageToJira).toBeDefined();
    });
  });
});
