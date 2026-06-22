import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  POLICY_SLUGS,
  SUPPORT_URL,
  fetchPublicPolicy,
  parsePolicyBody,
  policyExternalUrl,
} from './policy';

describe('policy urls', () => {
  it('builds the canonical TermsDesk page url per slug', () => {
    expect(policyExternalUrl(POLICY_SLUGS.terms)).toBe(
      'https://desk-platform.vercel.app/termsdesk/p/remote-devtools/terms-of-service',
    );
    expect(policyExternalUrl(POLICY_SLUGS.privacy)).toBe(
      'https://desk-platform.vercel.app/termsdesk/p/remote-devtools/privacy-policy',
    );
  });

  it('keeps the support board on the TermsDesk host', () => {
    expect(SUPPORT_URL).toBe('https://desk-platform.vercel.app/termsdesk/support/remote-devtools');
  });
});

describe('fetchPublicPolicy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requests the public JSON endpoint and returns the payload', async () => {
    const payload = { policySlug: 'terms-of-service', name: '이용약관', body: '본문' };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));

    const result = await fetchPublicPolicy(POLICY_SLUGS.terms);

    expect(result.name).toBe('이용약관');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://desk-platform.vercel.app/termsdesk/api/public/remote-devtools/policies/terms-of-service',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it('throws on a non-2xx response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 503 }));
    await expect(fetchPublicPolicy(POLICY_SLUGS.privacy)).rejects.toThrow(/503/);
  });
});

describe('parsePolicyBody', () => {
  it('parses markdown headings, paragraphs and bullet lists', () => {
    const blocks = parsePolicyBody(
      '# 제목\n첫 문단입니다.\n\n둘째 문단\n이어지는 줄\n\n- 항목 하나\n* 항목 둘',
    );
    expect(blocks).toEqual([
      { type: 'heading', text: '제목' },
      { type: 'paragraph', text: '첫 문단입니다.' },
      { type: 'paragraph', text: '둘째 문단\n이어지는 줄' },
      { type: 'list', items: ['항목 하나', '항목 둘'] },
    ]);
  });

  it('promotes Korean statute clause headers with body lines to headings', () => {
    const blocks = parsePolicyBody('제1조 (목적)\n이 약관은 서비스 이용 조건을 정합니다.');
    expect(blocks).toEqual([
      { type: 'heading', text: '제1조 (목적)' },
      { type: 'paragraph', text: '이 약관은 서비스 이용 조건을 정합니다.' },
    ]);
  });

  it('keeps a lone clause-shaped line as a paragraph', () => {
    expect(parsePolicyBody('제3조 관련 문의는 지원 게시판으로 보내주세요.')).toEqual([
      { type: 'paragraph', text: '제3조 관련 문의는 지원 게시판으로 보내주세요.' },
    ]);
  });

  it('splits mixed blocks into intro paragraph plus list', () => {
    const blocks = parsePolicyBody(
      '제2조 (처리 항목)\n처리될 수 있는 정보는 다음과 같습니다.\n- 계정 정보: 이메일\n- 이용 정보: 접속 기록',
    );
    expect(blocks).toEqual([
      { type: 'heading', text: '제2조 (처리 항목)' },
      { type: 'paragraph', text: '처리될 수 있는 정보는 다음과 같습니다.' },
      { type: 'list', items: ['계정 정보: 이메일', '이용 정보: 접속 기록'] },
    ]);
  });

  it('normalises CRLF and ignores empty blocks', () => {
    expect(parsePolicyBody('하나\r\n\r\n\r\n둘')).toEqual([
      { type: 'paragraph', text: '하나' },
      { type: 'paragraph', text: '둘' },
    ]);
  });
});
