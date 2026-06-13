import { GitBranch, Radio, Share2, Ticket, Video, Wand2, type LucideIcon } from 'lucide-react';

/** A feature card on the "Feature intro" page. */
export interface GuideFeature {
  id: string;
  icon: LucideIcon;
  titleKo: string;
  titleEn: string;
  descKo: string;
  descEn: string;
  /** Route to deep-link into when the card is clicked. */
  to: string;
}

export const GUIDE_FEATURES: GuideFeature[] = [
  {
    id: 'recording',
    icon: Video,
    titleKo: '세션 기록',
    titleEn: 'Session recording',
    descKo: 'rrweb 기반 전체 페이지 기록과 네트워크·콘솔·DOM 스냅샷을 한 번에 캡처합니다.',
    descEn: 'Full-page rrweb recording capturing network, console, and DOM snapshots together.',
    to: '/guide/user',
  },
  {
    id: 'ticket',
    icon: Ticket,
    titleKo: '티켓 생성',
    titleEn: 'Ticket automation',
    descKo: '템플릿으로 세션에서 곧바로 Jira 티켓을 만들고 담당자·컴포넌트·라벨을 채웁니다.',
    descEn:
      'Create Jira tickets straight from a session with templated assignees, components, and labels.',
    to: '/settings/profile',
  },
  {
    id: 'network',
    icon: Wand2,
    titleKo: 'Network Rewrite',
    titleEn: 'Network rewrite',
    descKo: '요청·응답을 가로채 모킹하고 엣지 케이스를 재현합니다.',
    descEn: 'Intercept and mock requests/responses to reproduce edge cases.',
    to: '/guide/user',
  },
  {
    id: 'design',
    icon: GitBranch,
    titleKo: '디자인 연동',
    titleEn: 'Design handoff',
    descKo: 'Figma 검수 링크로 디자인과 구현을 나란히 비교합니다.',
    descEn: 'Compare design and build side by side with Figma inspection links.',
    to: '/guide/user',
  },
  {
    id: 'share',
    icon: Share2,
    titleKo: '공유',
    titleEn: 'Team sharing',
    descKo: '세션과 코멘트를 팀과 공유하고 라이브 시청자를 실시간으로 확인합니다.',
    descEn: 'Share sessions and comments with the team and see live viewers in real time.',
    to: '/sessions',
  },
  {
    id: 'remote',
    icon: Radio,
    titleKo: 'Remote DevTools',
    titleEn: 'Remote DevTools',
    descKo: '도달할 수 없는 브라우저의 CDP 세션을 실시간으로 제어합니다.',
    descEn: 'Control CDP sessions on browsers you cannot reach, in real time.',
    to: '/remote-devtools',
  },
];

export interface GuideTab {
  id: string;
  labelKey: string;
  steps: { titleKo: string; titleEn: string; descKo: string; descEn: string }[];
}

export const USER_GUIDE_TABS: GuideTab[] = [
  {
    id: 'recording',
    labelKey: 'guide.tabRecording',
    steps: [
      {
        titleKo: 'SDK 설치',
        titleEn: 'Install the SDK',
        descKo: '대상 사이트에 remote-debug-sdk 를 추가하고 디바이스 ID 를 설정합니다.',
        descEn: 'Add remote-debug-sdk to the target site and set a device ID.',
      },
      {
        titleKo: '녹화 시작',
        titleEn: 'Start recording',
        descKo: '세션을 시작하면 네트워크·콘솔·DOM 이벤트가 자동으로 수집됩니다.',
        descEn: 'Start a session and network, console, and DOM events are captured automatically.',
      },
      {
        titleKo: '리플레이 확인',
        titleEn: 'Review the replay',
        descKo: '세션 상세에서 스크럽바로 재생하고 에러 마커로 바로 이동합니다.',
        descEn: 'Open the session detail, scrub the replay, and jump to error markers.',
      },
    ],
  },
  {
    id: 'ticket',
    labelKey: 'guide.tabTicket',
    steps: [
      {
        titleKo: '템플릿 설정',
        titleEn: 'Configure a template',
        descKo: '내 정보에서 Jira 프로젝트·컴포넌트·라벨 템플릿을 등록합니다.',
        descEn: 'Register Jira project, component, and label templates in your profile.',
      },
      {
        titleKo: '세션에서 생성',
        titleEn: 'Create from a session',
        descKo: '세션 상세에서 템플릿을 선택해 티켓을 생성합니다.',
        descEn: 'Pick a template on the session detail and create a ticket.',
      },
    ],
  },
  {
    id: 'network',
    labelKey: 'guide.tabNetwork',
    steps: [
      {
        titleKo: '규칙 작성',
        titleEn: 'Write a rule',
        descKo: '가로챌 URL 패턴과 대체 응답을 정의합니다.',
        descEn: 'Define the URL pattern to intercept and the replacement response.',
      },
      {
        titleKo: '재현',
        titleEn: 'Reproduce',
        descKo: '규칙을 적용한 채 세션을 다시 실행해 엣지 케이스를 확인합니다.',
        descEn: 'Re-run the session with the rule applied to confirm the edge case.',
      },
    ],
  },
  {
    id: 'design',
    labelKey: 'guide.tabDesign',
    steps: [
      {
        titleKo: 'Figma 연결',
        titleEn: 'Connect Figma',
        descKo: '검수 링크를 세션에 연결합니다.',
        descEn: 'Attach an inspection link to the session.',
      },
    ],
  },
  {
    id: 'share',
    labelKey: 'guide.tabShare',
    steps: [
      {
        titleKo: '링크 공유',
        titleEn: 'Share a link',
        descKo: '세션 링크를 팀에 공유하면 라이브 시청자가 표시됩니다.',
        descEn: 'Share the session link and live viewers appear for the team.',
      },
    ],
  },
];
