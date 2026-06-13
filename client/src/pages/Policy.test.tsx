import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PolicyPage from './Policy';

import type { PublicPolicy } from '@/lib/policy';

import { renderWithProviders } from '@/test/utils';

const TERMS_FIXTURE: PublicPolicy = {
  orgName: 'Remote DevTools',
  policySlug: 'terms-of-service',
  name: '이용약관',
  type: 'terms',
  locale: 'ko',
  versionId: 'remote-devtools:terms-of-service:v1',
  versionLabel: 'v1',
  contentHash: 'e0387969a7c7a1eefbe70b01da611b254bd57c5bcc038428a72609e22fd6e18f',
  body: '제1조 (목적)\n이 약관은 서비스 이용 조건을 정합니다.\n\n제2조 (서비스 범위)\n다음 기능을 제공합니다.\n- 세션 녹화\n- 원격 디버깅',
  // Mid-day UTC so the rendered calendar date is stable across CI timezones.
  effectiveAt: '2026-06-08T12:00:00.000Z',
  publishedAt: '2026-06-08T12:00:00.000Z',
  changeSummary: 'TermsDesk 중앙 게시본으로 이전',
  availableVersions: ['v1'],
};

function mockPolicyFetch(payload: PublicPolicy) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
}

describe('PolicyPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the fetched publication with promoted clause headings and lists', async () => {
    const fetchMock = mockPolicyFetch(TERMS_FIXTURE);
    renderWithProviders(<PolicyPage slug="terms-of-service" />);

    expect(await screen.findByRole('heading', { level: 1, name: '이용약관' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '제1조 (목적)' })).toBeInTheDocument();
    expect(screen.getByText('이 약관은 서비스 이용 조건을 정합니다.')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual(['세션 녹화', '원격 디버깅']);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://termsdesk.vercel.app/api/public/remote-devtools/policies/terms-of-service',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it('shows the trust surface: version, truncated hash, effective date, source link', async () => {
    mockPolicyFetch(TERMS_FIXTURE);
    renderWithProviders(<PolicyPage slug="terms-of-service" />);

    const trust = await screen.findByTestId('policy-trust');
    expect(trust).toHaveTextContent('Version v1');
    // First 12 chars of the content hash + ellipsis — full hash stays in the title attr.
    expect(trust).toHaveTextContent('e0387969a7c7…');
    expect(trust).not.toHaveTextContent(TERMS_FIXTURE.contentHash);
    expect(trust).toHaveTextContent(/Effective June 8, 2026/);

    expect(screen.getByRole('link', { name: /View on TermsDesk/ })).toHaveAttribute(
      'href',
      'https://termsdesk.vercel.app/p/remote-devtools/terms-of-service',
    );
  });

  it('shows a loading skeleton while the document is in flight', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise<Response>(() => {}));
    renderWithProviders(<PolicyPage slug="privacy-policy" />);
    expect(screen.getByTestId('policy-skeleton')).toBeInTheDocument();
  });

  it('falls back to an external TermsDesk card when the registry is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('down', { status: 503 }));
    renderWithProviders(<PolicyPage slug="privacy-policy" />);

    const card = await screen.findByTestId('policy-error');
    expect(card).toHaveTextContent("Couldn't load this document");
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open on TermsDesk/ })).toHaveAttribute(
      'href',
      'https://termsdesk.vercel.app/p/remote-devtools/privacy-policy',
    );
  });
});
