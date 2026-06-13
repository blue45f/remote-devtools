import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BillingWebhookEventEntity,
  OrganizationEntity,
  RecordEntity,
  ReplayCommentEntity,
  TicketLogEntity,
} from '@remote-platform/entity';
import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityModule } from '../src/modules/activity/activity.module';
import { ActivityService } from '../src/modules/activity/activity.service';
import { AuthGuard } from '../src/modules/auth/auth.guard';
import { AuthModule } from '../src/modules/auth/auth.module';
import { BillingModule } from '../src/modules/billing/billing.module';

import type { INestApplication } from '@nestjs/common';

/**
 * NestJS supertest e2e suites for modules that do NOT need Postgres.
 *
 * Each `describe` block boots a Nest app from a single feature module via
 * `Test.createTestingModule({ imports: [Module] })` — never the full
 * `AppModule` — so we never touch the database. Modules that *transitively*
 * depend on TypeORM (e.g. ActivityModule via TypeOrmModule.forFeature)
 * have their repository tokens overridden with stubs so the DI container
 * resolves without a live data source.
 *
 * These tests run separately from the unit suite via:
 *   pnpm test:e2e
 * (see vitest.e2e.config.ts at the repo root)
 */

/* ------------------------------------------------------------------ */
/* AuthModule                                                          */
/* ------------------------------------------------------------------ */

describe('AuthModule (e2e)', () => {
  // The AuthService reads `process.env.AUTH_JWT_SECRET` and `NODE_ENV` at
  // *call time*, so each test can mutate them freely as long as we restore
  // them afterwards. We snapshot at suite start and replay at teardown.
  const originalEnv = {
    secret: process.env.AUTH_JWT_SECRET,
    publicKey: process.env.AUTH_JWT_PUBLIC_KEY,
    issuer: process.env.AUTH_JWT_ISSUER,
    nodeEnv: process.env.NODE_ENV,
  };

  const restore = (k: keyof typeof originalEnv, envKey: string) => {
    const v = originalEnv[k];
    if (v === undefined) delete process.env[envKey];
    else process.env[envKey] = v;
  };

  afterAll(() => {
    restore('secret', 'AUTH_JWT_SECRET');
    restore('publicKey', 'AUTH_JWT_PUBLIC_KEY');
    restore('issuer', 'AUTH_JWT_ISSUER');
    restore('nodeEnv', 'NODE_ENV');
  });

  beforeEach(() => {
    delete process.env.AUTH_JWT_SECRET;
    delete process.env.AUTH_JWT_PUBLIC_KEY;
    delete process.env.AUTH_JWT_ISSUER;
    delete process.env.NODE_ENV;
  });

  const bootApp = async (): Promise<INestApplication> => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    return app;
  };

  describe('auth disabled (no env set)', () => {
    let app: INestApplication;
    beforeEach(async () => {
      app = await bootApp();
    });
    afterEach(async () => {
      await app.close();
    });

    it('GET /api/auth/status returns { enabled: false }', async () => {
      const res = await request(app.getHttpServer()).get('/api/auth/status');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ enabled: false });
    });

    it('POST /api/auth/dev-token returns 503', async () => {
      const res = await request(app.getHttpServer()).post('/api/auth/dev-token').send({});
      expect(res.status).toBe(503);
    });
  });

  describe('auth enabled (AUTH_JWT_SECRET set)', () => {
    let app: INestApplication;
    beforeEach(async () => {
      process.env.AUTH_JWT_SECRET = 'test-secret';
      app = await bootApp();
    });
    afterEach(async () => {
      await app.close();
    });

    it('GET /api/auth/status returns { enabled: true }', async () => {
      const res = await request(app.getHttpServer()).get('/api/auth/status');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ enabled: true });
    });

    it("POST /api/auth/dev-token returns { token, type: 'Bearer' }", async () => {
      const res = await request(app.getHttpServer()).post('/api/auth/dev-token').send({});
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ type: 'Bearer' });
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.length).toBeGreaterThan(0);
    });
  });

  describe('auth enabled in production', () => {
    let app: INestApplication;
    beforeEach(async () => {
      process.env.AUTH_JWT_SECRET = 'test-secret';
      process.env.NODE_ENV = 'production';
      app = await bootApp();
    });
    afterEach(async () => {
      await app.close();
    });

    it('POST /api/auth/dev-token returns 400 in production', async () => {
      const res = await request(app.getHttpServer()).post('/api/auth/dev-token').send({});
      expect(res.status).toBe(400);
    });
  });
});

/* ------------------------------------------------------------------ */
/* ActivityModule                                                      */
/* ------------------------------------------------------------------ */

describe('ActivityModule (e2e)', () => {
  let app: INestApplication;
  let mockActivityService: { getFeedPage: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    // Default stub: empty page. Individual tests override with mockResolvedValueOnce.
    mockActivityService = {
      getFeedPage: vi.fn().mockResolvedValue({ rows: [], nextCursor: null }),
    };

    // ActivityController applies `@UseGuards(AuthGuard)`, but ActivityModule
    // does NOT import AuthModule — the guard is no-op in self-host mode, so
    // production wires it globally. For this isolated module test we simply
    // override the guard with a pass-through. (This mirrors how AppModule
    // resolves the dependency at runtime via the global injector.)
    delete process.env.AUTH_JWT_SECRET;
    delete process.env.AUTH_JWT_PUBLIC_KEY;

    const moduleRef = await Test.createTestingModule({
      imports: [ActivityModule],
    })
      .overrideProvider(ActivityService)
      .useValue(mockActivityService)
      // ActivityModule imports
      // TypeOrmModule.forFeature([Record, TicketLog, ReplayComment]); we stub
      // the repos so the DI container resolves without a database.
      .overrideProvider(getRepositoryToken(RecordEntity))
      .useValue({})
      .overrideProvider(getRepositoryToken(TicketLogEntity))
      .useValue({})
      .overrideProvider(getRepositoryToken(ReplayCommentEntity))
      .useValue({})
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/activity/feed returns a bare array (back-compat)', async () => {
    mockActivityService.getFeedPage.mockResolvedValueOnce({
      rows: [
        {
          id: 'session-1',
          kind: 'session',
          title: 'Live session · alpha',
          at: '2026-05-21T10:00:00.000Z',
        },
      ],
      nextCursor: null,
    });

    const res = await request(app.getHttpServer()).get('/api/activity/feed');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 'session-1', kind: 'session' });
    // Default limit = 20, no scope, no cursor
    expect(mockActivityService.getFeedPage).toHaveBeenCalledWith(20, null, null, 'ko');
  });

  it('GET /api/activity/feed?before=ISO returns the paginated envelope', async () => {
    const page = {
      rows: [
        {
          id: 'session-2',
          kind: 'session',
          title: 'Recorded session · beta',
          at: '2024-12-31T10:00:00.000Z',
        },
      ],
      nextCursor: '2024-12-31T09:00:00.000Z',
    };
    mockActivityService.getFeedPage.mockResolvedValueOnce(page);

    const res = await request(app.getHttpServer())
      .get('/api/activity/feed')
      .query({ before: '2025-01-01T00:00:00Z' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(false);
    expect(res.body).toEqual(page);
    expect(mockActivityService.getFeedPage).toHaveBeenCalledWith(
      20,
      null,
      '2025-01-01T00:00:00Z',
      'ko',
    );
  });

  it('GET /api/activity/feed?limit=200 clamps the limit down to 100', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/activity/feed')
      .query({ limit: '200' });
    expect(res.status).toBe(200);
    expect(mockActivityService.getFeedPage).toHaveBeenCalledWith(100, null, null, 'ko');
  });
});

/* ------------------------------------------------------------------ */
/* BillingModule                                                       */
/* ------------------------------------------------------------------ */

describe('BillingModule (e2e)', () => {
  const originalStripe = process.env.STRIPE_SECRET_KEY;
  let app: INestApplication | undefined;

  const getHttpServer = () => {
    if (!app) {
      throw new Error('Billing e2e app has not been initialized.');
    }
    return app.getHttpServer();
  };

  beforeEach(async () => {
    // BillingService checks STRIPE_SECRET_KEY at call time; ensure unset.
    delete process.env.STRIPE_SECRET_KEY;
    const moduleRef = await Test.createTestingModule({
      imports: [BillingModule],
    })
      .overrideProvider(getRepositoryToken(OrganizationEntity))
      .useValue({ update: vi.fn() })
      .overrideProvider(getRepositoryToken(BillingWebhookEventEntity))
      .useValue({ insert: vi.fn(), findOne: vi.fn(), delete: vi.fn() })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(() => {
    if (originalStripe === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = originalStripe;
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('GET /api/billing/status returns { enabled: false } when STRIPE_SECRET_KEY is unset', async () => {
    const res = await request(getHttpServer()).get('/api/billing/status');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ enabled: false });
  });

  it('GET /api/billing/subscription requires authenticated org context and returns 400 in self-host mode', async () => {
    const res = await request(getHttpServer()).get('/api/billing/subscription');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Authenticated org is required.');
  });

  it('POST /api/billing/portal requires authenticated org context and returns 400 in self-host mode', async () => {
    const res = await request(getHttpServer())
      .post('/api/billing/portal')
      .send({ returnUrl: 'https://example.com/account' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Authenticated org is required.');
  });

  it('POST /api/billing/webhook returns 400 when stripe-signature header is missing', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    const res = await request(getHttpServer())
      .post('/api/billing/webhook')
      .send({ hello: 'world' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Missing stripe-signature header');
  });
});
