import * as UI from '../../ui/legacy/legacy.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';

let sessionReplayPanelInstance;

/**
 * rrweb 기반 세션 리플레이 패널
 * 완전히 새롭게 재구현된 버전
 */
export class SessionReplayPanel extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('panels/session_replay/session_replay.css');
    
    // 상태 관리
    this.sessions = [];
    this.currentSession = null;
    this.events = [];
    this.rrwebEvents = [];
    this.replayer = null;
    this.isLoading = false;
    this.duration = 0;
    this.playbackSpeed = 1;
    this.s3SessionId = null;  // S3 세션 ID 저장
    
    // UI 요소 참조
    this.videoContainer = null;
    this.playBtn = null;
    this.progressBar = null;
    this.currentTimeDisplay = null;
    this.durationDisplay = null;
    this.timeUpdateTimer = null;
    this.animationFrameId = null;
    this.lastKnownTime = 0;  // 마지막으로 알려진 재생 시간
    
    // WebSocket 메시지 리스너 등록
    this.setupWebSocketListener();
  }
  
  static instance() {
    if (!sessionReplayPanelInstance) {
      sessionReplayPanelInstance = new SessionReplayPanel();
    }
    return sessionReplayPanelInstance;
  }
  
  setupWebSocketListener() {
    // DevTools의 WebSocket 연결에서 SessionReplay.setSessionId 메시지 수신
    if (window.InspectorFrontendHost && window.InspectorFrontendHost.sendMessageToBackend) {
      // DevTools 메시지 핸들러 등록
      const originalSendMessageToBackend = window.InspectorFrontendHost.sendMessageToBackend;
      window.InspectorFrontendHost.sendMessageToBackend = (message) => {
        try {
          const parsed = JSON.parse(message);
          if (parsed.method === 'SessionReplay.setSessionId') {
            console.log('[SessionReplay] Received S3 session ID:', parsed.params.sessionId);
            this.s3SessionId = parsed.params.sessionId;
          }
        } catch (e) {
          // 파싱 실패는 무시
        }
        return originalSendMessageToBackend.call(window.InspectorFrontendHost, message);
      };
    }
    
    // WebSocket 메시지를 직접 가로채기 (대안 방법)
    if (window.WebSocket) {
      const originalWebSocket = window.WebSocket;
      window.WebSocket = function(...args) {
        const ws = new originalWebSocket(...args);
        const originalOnMessage = ws.onmessage;
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.method === 'SessionReplay.setSessionId') {
              console.log('[SessionReplay] Received session ID via WebSocket:', data.params.sessionId);
              if (sessionReplayPanelInstance) {
                sessionReplayPanelInstance.s3SessionId = data.params.sessionId;
              }
            }
          } catch (e) {
            // 파싱 실패는 무시
          }
          
          if (originalOnMessage) {
            originalOnMessage.call(ws, event);
          }
        };
        
        return ws;
      };
    }
  }
  
  async loadLibraries() {
    try {
      // rrweb 라이브러리 로드 (로컬 파일)
      if (!window.rrweb) {
        await this.loadScript('./third_party/rrweb/rrweb.min.js');
      }
      
      // rrweb-player CSS 로드 (로컬 파일)
      if (!document.querySelector('#rrweb-player-style')) {
        const style = document.createElement('link');
        style.id = 'rrweb-player-style';
        style.rel = 'stylesheet';
        style.href = './third_party/rrweb/rrweb-player.css';
        document.head.appendChild(style);
      }
      
      // rrweb-player 로드 (로컬 파일)
      if (!window.rrwebPlayer) {
        await this.loadScript('./third_party/rrweb/rrweb-player.min.js');
      }
      

      // render() 호출 제거 - wasShown()에서 처리
    } catch (error) {
      console.error('[SessionReplay] 라이브러리 로드 실패:', error);
      this.renderError('라이브러리 로드 실패! 애드블록 익스텐션을 사용중이라면, 비활성화 / 해당페이지 예외처리를 해주세요!');
    }
  }
  
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  async wasShown() {

    
    // 이미 로드 중이면 중복 실행 방지
    if (this.isLoading) {

      return;
    }
    
    this.isLoading = true;
    
    // 초기 로딩 화면 표시
    this.render();
    
    // 라이브러리가 로드되지 않았다면 먼저 로드
    if (!window.rrweb) {
      await this.loadLibraries();
    }
    
    // 세션 로드
    await this.loadSession();
    
    this.isLoading = false;
  }
  
  willHide() {
    this.stopReplay();
  }
  
  async loadSession() {
    try {
      // URL에서 recordId 추출
      const urlParams = new URLSearchParams(window.location.search);
      const wsParam = urlParams.get('ws') || urlParams.get('wss');
      const s3FilePath = urlParams.get('s3FilePath');
      let recordId = null;
      
      if (wsParam) {
        // ws URL에서 recordId 추출
        const decodedWs = decodeURIComponent(wsParam);
        const wsUrlParams = new URLSearchParams(decodedWs.split('?')[1]);
        recordId = wsUrlParams.get('recordId');
      }
      
      if (!recordId) {
        // recordId가 없으면 데이터 없음 표시
        this.renderNoData();
        return;
      }
      
      // recordId에 해당하는 세션 가져오기 
      const sessionsResponse = await fetch(`/api/session-replay/sessions?room=${recordId}&limit=1`);
      const sessions = await sessionsResponse.json();
      
      if (!sessions || sessions.length === 0) {
        // 해당 녹화 세션에 세션이 없는 경우
        this.renderNoData();
        return;
      }
      
      console.log(`[SessionReplay] 🔍 URL debugging:`);
      console.log(`  📍 Full URL: ${window.location.href}`);
      console.log(`  📦 ws param: ${wsParam}`);
      console.log(`  📄 Extracted recordId: ${recordId}`);
      console.log(`  📁 s3FilePath: ${s3FilePath || 'N/A'}`);
      
      let sessionId;
      
      // URL에서 추출한 recordId가 S3 형태면 우선 사용
      if (recordId && recordId.startsWith('s3-')) {
        sessionId = recordId;
        console.log(`[SessionReplay] Using S3 session ID from URL: ${sessionId}`);
      } else if (this.s3SessionId) {
        sessionId = this.s3SessionId;
        console.log(`[SessionReplay] Using S3 session ID from server: ${sessionId}`);
      } else if (recordId) {
        // DB 기록인 경우
        sessionId = parseInt(recordId);
        console.log(`[SessionReplay] Using DB session ID: ${sessionId}`);
      } else {
        // recordId가 없으면 최신 세션 사용 (기존 동작)
        console.log(`[SessionReplay] No recordId found, loading latest session`);
        const sessionsResponse = await fetch('/api/session-replay/sessions?limit=1');
        const sessions = await sessionsResponse.json();
        
        if (!sessions || sessions.length === 0) {
          this.renderNoData();
          return;
        }
        
        sessionId = sessions[0].id;
        console.log(`[SessionReplay] Using latest session ID: ${sessionId}`);
      }

      // 세션 이벤트 가져오기
      let apiUrl = `/api/session-replay/sessions/${sessionId}/events`;
      
      // S3 파일 경로가 있으면 쿼리 파라미터로 추가
      if (s3FilePath) {
        apiUrl += `?s3FilePath=${encodeURIComponent(s3FilePath)}`;
        console.log(`[SessionReplay] 📁 Using S3 file path: ${s3FilePath}`);
      }
      
      console.log(`[SessionReplay] 🌐 API Call: ${apiUrl}`);
      
      const eventsResponse = await fetch(apiUrl);
      const events = await eventsResponse.json();
      
      console.log(`[SessionReplay] 📦 API Response:`, {
        sessionId,
        eventsCount: events?.length || 0,
        firstEvent: events?.[0],
        lastEvent: events?.[events?.length - 1]
      });
      
      if (!events || events.length === 0) {
        console.warn(`[SessionReplay] ⚠️ No events found for session: ${sessionId}`);
        this.renderNoData();
        return;
      }
      

      
      // rrweb 이벤트 추출
      this.extractRRWebEvents(events);
      
      if (this.rrwebEvents.length === 0) {
        this.renderNoData();
        return;
      }
      

      
      // 플레이어 초기화

      this.initializePlayer();
      
    } catch (error) {
      console.error('[SessionReplay] 세션 로드 실패:', error);
      this.renderError('세션 로드 실패');
    }
  }
  
  extractRRWebEvents(events) {
    this.rrwebEvents = [];
    
    console.log(`[SessionReplay] 🔍 Extracting rrweb events from ${events.length} events`);
    console.log(`[SessionReplay] 📄 First event sample:`, events[0]);
    
    for (const event of events) {
      let rrwebEvent = null;
      
      // S3 백업에서 온 이벤트는 protocol에 직접 rrweb 이벤트가 들어있음
      if (event.protocol && typeof event.protocol.type === 'number') {
        // protocol 자체가 rrweb 이벤트
        rrwebEvent = event.protocol;
        console.log(`[SessionReplay] 📦 Found direct rrweb event: type ${rrwebEvent.type}`);
      } else if (event.isRRWeb && event.protocol) {
        // 이미 rrweb 이벤트 형식
        rrwebEvent = event.protocol;
      } else if (event.protocol?.params?.event) {
        // SessionReplay.rrwebEvent 형식
        rrwebEvent = event.protocol.params.event;
      } else if (event.protocol?.params?.events) {
        // SessionReplay.rrwebEvents 배치 형식
        this.rrwebEvents.push(...event.protocol.params.events);
        continue;
      }
      
      if (rrwebEvent) {
        this.rrwebEvents.push(rrwebEvent);
      }
    }
    

    
    console.log(`[SessionReplay] 📊 Extracted ${this.rrwebEvents.length} rrweb events`);
    
    // 이벤트 타입별 통계
    const eventTypes = {};
    this.rrwebEvents.forEach(e => {
      const type = e.type;
      eventTypes[type] = (eventTypes[type] || 0) + 1;
    });

    // timestamp 기준 정렬
    this.rrwebEvents.sort((a, b) => a.timestamp - b.timestamp);
    
    // 시간 정규화 (첫 이벤트를 0으로)
    if (this.rrwebEvents.length > 0) {
      const firstTimestamp = this.rrwebEvents[0].timestamp;
      this.rrwebEvents = this.rrwebEvents.map(event => ({
        ...event,
        timestamp: event.timestamp - firstTimestamp
      }));
      
      // 전체 재생 시간 계산
      const lastEvent = this.rrwebEvents[this.rrwebEvents.length - 1];
      this.duration = lastEvent.timestamp;
      this.lastKnownTime = 0;  // 새 세션 시작 시 리셋
      

    }
  }
  
  render() {
    const html = LitHtml.html`
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #181818;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        
        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #999;
          font-size: 18px;
        }
        
        .error {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #ff4444;
          font-size: 18px;
        }
        
        .no-data {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #666;
          font-size: 18px;
        }
      </style>
      
      <div class="loading">
        라이브러리 로딩 중...
      </div>
    `;
    
    LitHtml.render(html, this.contentElement, { host: this });
  }
  

  
  initializePlayer() {
    // 전체 contentElement를 컨테이너로 사용
    const container = this.contentElement;
    
    if (!container || !window.rrweb || this.rrwebEvents.length === 0) {
      console.error('[SessionReplay] 플레이어 초기화 실패 - 필수 요소 없음');
      return;
    }
    
    // 기존 플레이어 정리
    if (this.replayer) {
      this.replayer.destroy();
      this.replayer = null;
    }
    
    // 전체 컨테이너 초기화
    container.innerHTML = '';
    container.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      background: #000;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: stretch;
      padding: 0;
      box-sizing: border-box;
    `;
    
    try {
      // 비디오 컨테이너 생성 (플레이어 + 컨트롤 포함) - 화면 전체 사용
      const videoContainer = document.createElement('div');
      videoContainer.className = 'video-container';
      videoContainer.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: #000;
        overflow: hidden;
      `;
      container.appendChild(videoContainer);
      
      // 플레이어 wrapper div 생성 - 컨트롤 영역 제외한 나머지 공간 사용
      const playerWrapper = document.createElement('div');
      playerWrapper.className = 'rrweb-player-wrapper';
      playerWrapper.style.cssText = `
        width: 100%;
        flex: 1;
        position: relative;
        background: #1a1a1a;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        min-height: 0;  /* flex 컨테이너에서 자식이 줄어들 수 있도록 */
      `;
      videoContainer.appendChild(playerWrapper);
      
      // 실제 비디오 컨테이너 (비율 유지용)
      const aspectWrapper = document.createElement('div');
      aspectWrapper.className = 'aspect-wrapper';
      aspectWrapper.style.cssText = `
        position: relative;
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 20px rgba(0,0,0,0.5);
      `;
      playerWrapper.appendChild(aspectWrapper);
      
      // FullSnapshot에서 원본 크기 먼저 추출
      let recordedWidth = 1920;  // 기본값 (데스크톱)
      let recordedHeight = 1080; // 기본값 (데스크톱)
      
      const fullSnapshot = this.rrwebEvents.find(e => e.type === 2);
      
      if (fullSnapshot && fullSnapshot.data) {
        // data에서 width/height 직접 확인 (SDK에서 추가한 viewport 정보)
        if (fullSnapshot.data.width && fullSnapshot.data.height) {
          recordedWidth = fullSnapshot.data.width;
          recordedHeight = fullSnapshot.data.height;
        }
      }
      
      // Meta 이벤트(type 4)에서 viewport 정보 찾기
      const metaEvent = this.rrwebEvents.find(e => e.type === 4 && e.data?.width);
      if (metaEvent && metaEvent.data) {
        recordedWidth = metaEvent.data.width;
        recordedHeight = metaEvent.data.height;
      }
      
      // rrweb Replayer 생성 - width/height 명시적 설정
      this.replayer = new window.rrweb.Replayer(this.rrwebEvents, {
        root: aspectWrapper,
        width: recordedWidth,
        height: recordedHeight,
        loadTimeout: 60000,
        skipInactive: true,
        showWarning: false,
        showDebug: false,
        blockClass: 'rr-block',
        liveMode: false,
        insertStyleRules: [
          // html/body 크기 강제 설정
          `html, body { 
            margin: 0 !important; 
            padding: 0 !important; 
            width: ${recordedWidth}px !important; 
            height: ${recordedHeight}px !important;
            overflow: visible !important;
            min-width: ${recordedWidth}px !important;
            min-height: ${recordedHeight}px !important;
          }`,

        ],
        triggerFocus: false,
        UNSAFE_replayCanvas: true,
        pauseAnimation: true,
        mouseTail: true,
        showController: false,
        speed: 1,
      });
      
      // rrweb이 생성한 iframe 스타일 조정 및 비율 유지
      setTimeout(() => {
        // 위에서 이미 추출한 크기 사용

        
        // 스케일 정보를 전역으로 저장 (클릭 이벤트에서 사용)
        this.recordedViewport = { width: recordedWidth, height: recordedHeight };
        
        // playerWrapper의 실제 크기 가져오기 (패딩 제외)
        const containerRect = playerWrapper.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        // 원본 비율 계산
        const recordedAspectRatio = recordedWidth / recordedHeight;
        
        let displayWidth, displayHeight, scale;
      // 너비 기준으로 계산
      const widthBasedHeight = containerWidth / recordedAspectRatio;
      // 높이 기준으로 계산  
      const heightBasedWidth = containerHeight * recordedAspectRatio;
      
      // 컨테이너 안에 들어가는 최대 크기 선택 (fit-contain 방식)
      if (widthBasedHeight <= containerHeight) {
        // 너비에 맞춤 (상하에 검은 여백)
        displayWidth = containerWidth;
        displayHeight = widthBasedHeight;
        scale = containerWidth / recordedWidth;
      } else {
        // 높이에 맞춤 (좌우에 검은 여백)
        displayWidth = heightBasedWidth;
        displayHeight = containerHeight;
        scale = containerHeight / recordedHeight;
      }        
        // 최대 크기 제한 (원본 크기의 150%를 넘지 않도록)
        const maxScale = 1.5;
        if (scale > maxScale) {
          scale = maxScale;
          displayWidth = recordedWidth * maxScale;
          displayHeight = recordedHeight * maxScale;
        }
        
        // aspectWrapper 크기와 위치 설정 - margin: auto로 중앙 정렬
        aspectWrapper.style.cssText = `
          position: relative;
          width: ${displayWidth}px;
          height: ${displayHeight}px;
          margin: auto;
          background: #000;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
          overflow: hidden;
        `;
        
        // iframe 찾기 및 스타일 적용
        const iframe = aspectWrapper.querySelector('iframe');
        if (iframe) {
          // 스케일과 오프셋 정보 저장 (클릭 이벤트에서 사용)
          this.iframeScale = scale;
          this.displaySize = { width: displayWidth, height: displayHeight };
          
          // iframe을 원본 크기로 설정하고 scale로 조정
          iframe.style.cssText = `
            width: ${recordedWidth}px !important;
            height: ${recordedHeight}px !important;
            border: none !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            transform: scale(${scale}) !important;
            transform-origin: top left !important;
            background: white;
            overflow: visible !important;
          `;
          
          // 실제 적용된 크기 확인
          setTimeout(() => {
            const iframeRect = iframe.getBoundingClientRect();
          }, 100);
          
          // iframe의 document에도 크기 강제 설정
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            // viewport 메타 태그 추가/수정
            let viewport = iframeDoc.querySelector('meta[name="viewport"]');
            if (!viewport) {
              viewport = iframeDoc.createElement('meta');
              viewport.name = 'viewport';
              iframeDoc.head?.appendChild(viewport);
            }
            viewport.content = `width=${recordedWidth}, height=${recordedHeight}, initial-scale=1, maximum-scale=1`;
            
            // body 스타일 재설정
            if (iframeDoc.body) {
              iframeDoc.body.style.cssText = `
                margin: 0 !important;
                padding: 0 !important;
                width: ${recordedWidth}px !important;
                height: ${recordedHeight}px !important;
                min-height: ${recordedHeight}px !important;
                overflow: visible !important;
              `;
            }
          }
        }
        
        // 저장된 wrapper 참조 (클릭 이벤트에서 사용)
        this.aspectWrapper = aspectWrapper;
        
        // replayer wrapper 스타일 조정
        const replayerWrapper = aspectWrapper.querySelector('.replayer-wrapper');
        if (replayerWrapper) {
          replayerWrapper.style.cssText = `
            width: 100% !important;
            height: 100% !important;
            position: relative !important;
            background: transparent !important;
          `;
        }
        
        // 윈도우 리사이즈 시 비율 유지
        const resizeHandler = () => {
          const newContainerRect = playerWrapper.getBoundingClientRect();
          const newContainerWidth = newContainerRect.width;
          const newContainerHeight = newContainerRect.height;
          
          let newDisplayWidth, newDisplayHeight, newScale;
          
          // 너비 기준으로 계산
          const widthBasedHeight = newContainerWidth / recordedAspectRatio;
          
          // 높이 기준으로 계산  
          const heightBasedWidth = newContainerHeight * recordedAspectRatio;
          
          // 컨테이너 안에 들어가는 최대 크기 선택
          if (widthBasedHeight <= newContainerHeight) {
            // 너비에 맞춤
            newDisplayWidth = newContainerWidth;
            newDisplayHeight = widthBasedHeight;
            newScale = newContainerWidth / recordedWidth;
          } else {
            // 높이에 맞춤
            newDisplayWidth = heightBasedWidth;
            newDisplayHeight = newContainerHeight;
            newScale = newContainerHeight / recordedHeight;
          }
          
          // 최대 크기 제한
          const maxScale = 1.5;
          if (newScale > maxScale) {
            newScale = maxScale;
            newDisplayWidth = recordedWidth * maxScale;
            newDisplayHeight = recordedHeight * maxScale;
          }
          
          // aspectWrapper 크기 업데이트
          aspectWrapper.style.width = `${newDisplayWidth}px`;
          aspectWrapper.style.height = `${newDisplayHeight}px`;
          
          // iframe 스케일 업데이트
          if (iframe) {
            iframe.style.transform = `scale(${newScale}) !important`;
          }
          
          // 클릭 이벤트용 정보 업데이트
          this.iframeScale = newScale;
          this.displaySize = { width: newDisplayWidth, height: newDisplayHeight };
        };
        
        // 리사이즈 이벤트 리스너 추가
        window.addEventListener('resize', resizeHandler);
        
        // cleanup을 위해 저장
        this.resizeHandler = resizeHandler;
      }, 200);
      
      // 커스텀 컨트롤 추가
      this.addCustomControls(videoContainer);
      

      
      // 이벤트 리스너 설정
      this.replayer.on('finish', () => {
        // 재생이 끝났을 때 pause 호출
        this.pause();
      });
      

      
      // 컨테이너가 포커스를 받을 수 있도록 설정
      videoContainer.tabIndex = 0;
      
      // 키보드 단축키 추가 (패널 내에서만)
      this.keydownHandler = (e) => {
        // 입력 필드에 포커스가 있으면 무시
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch(e.key) {
          case ' ':  // 스페이스바: 재생/일시정지
            e.preventDefault();
            this.togglePlay();
            break;
          case 'ArrowLeft':  // 왼쪽 화살표: 5초 뒤로
            e.preventDefault();
            const currentTime = this.replayer.getCurrentTime ? this.replayer.getCurrentTime() : 0;
            const backTime = Math.max(0, currentTime - 5000);
            this.seekTo((backTime / this.duration) * 100);
            break;
          case 'ArrowRight':  // 오른쪽 화살표: 5초 앞으로
            e.preventDefault();
            const currentTimeForward = this.replayer.getCurrentTime ? this.replayer.getCurrentTime() : 0;
            const forwardTime = Math.min(this.duration, currentTimeForward + 5000);
            this.seekTo((forwardTime / this.duration) * 100);
            break;
          case '0':  // 처음으로
            e.preventDefault();
            this.seekTo(0);
            break;
        }
      };
      videoContainer.addEventListener('keydown', this.keydownHandler);
      
      // 클릭 이벤트 표시를 위한 커스텀 구현
      this.replayer.on('event-cast', (event) => {
        if (event.type === 3 && event.data?.source === 2) {
          // 클릭 이벤트인 경우
          if (event.data.type === 2) {

            
            // aspectWrapper에 클릭 표시
            setTimeout(() => {
              // aspectWrapper가 있는지 확인
              if (!this.aspectWrapper) {
                return;
              }
              
              // 클릭 애니메이션 요소 생성
              const clickEffect = document.createElement('div');
              clickEffect.className = 'custom-click-effect';
              
              // 원본 좌표를 비율에 맞게 변환
              // 원본 좌표는 원본 뷰포트 기준이므로, 현재 표시 크기에 맞게 스케일 적용
              const scale = this.iframeScale || 1;
              const x = event.data.x * scale;
              const y = event.data.y * scale;
              

              
              // 클릭 효과 크기도 스케일에 맞게 조정
              const effectSize = 30 * scale;
              
              clickEffect.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                width: ${effectSize}px;
                height: ${effectSize}px;
                transform: translate(-50%, -50%);
                border: 3px solid #4CAF50;
                border-radius: 50%;
                background: rgba(76, 175, 80, 0.3);
                pointer-events: none;
                z-index: 999999;
                animation: customClickPulse 0.6s ease-out forwards;
              `;
              
              // 애니메이션 스타일 추가 (한 번만)
              if (!this.aspectWrapper.querySelector('#custom-click-styles')) {
                const style = document.createElement('style');
                style.id = 'custom-click-styles';
                style.textContent = `
                  @keyframes customClickPulse {
                    0% {
                      transform: translate(-50%, -50%) scale(1);
                      opacity: 1;
                    }
                    100% {
                      transform: translate(-50%, -50%) scale(2);
                      opacity: 0;
                    }
                  }
                `;
                this.aspectWrapper.appendChild(style);
              }
              
              // aspectWrapper에 추가
              this.aspectWrapper.appendChild(clickEffect);
              
              // 애니메이션 후 제거
              setTimeout(() => {
                clickEffect.remove();
              }, 600);
            }, 10);  // 약간의 지연으로 렌더링 타이밍 맞춤
          }
        }
      });
      

      
    } catch (error) {
      console.error('[SessionReplay] 플레이어 초기화 오류:', error);
      this.renderError('플레이어 초기화 실패');
    }
  }
  
  togglePlay() {
    if (!this.replayer) return;
    
    // 재생 버튼의 현재 상태로 판단
    const playBtn = this.contentElement.querySelector('.play-btn');
    const isCurrentlyPlaying = playBtn?.textContent === '⏸';
    
    if (isCurrentlyPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }
  
  play() {
    if (!this.replayer) return;
    
    // rrweb의 내장 getCurrentTime 사용
    let currentTime = this.replayer.getCurrentTime ? this.replayer.getCurrentTime() : 0;
    
    // 끝까지 재생된 경우에만 처음부터
    if (currentTime >= this.duration - 100) {
      this.replayer.play(0);
      this.lastKnownTime = 0;
    } else if (currentTime > 0) {
      // 중간 지점에서 재생 - play(currentTime) 사용
      this.replayer.play(currentTime);
    } else if (this.lastKnownTime > 0) {
      // getCurrentTime이 0이지만 lastKnownTime이 있는 경우
      this.replayer.play(this.lastKnownTime);
    } else {
      // 처음부터 재생
      this.replayer.play(0);
    }
    
    this.startTimeUpdate();
    
    // 버튼을 일시정지 모드로 변경
    const playBtn = this.contentElement.querySelector('.play-btn');
    if (playBtn) {
      playBtn.textContent = '⏸';
    }
    
    this.updateUI();
  }
  
  pause() {
    if (!this.replayer) return;
    
    // 일시정지 전에 현재 시간 저장
    const currentTime = this.replayer.getCurrentTime ? this.replayer.getCurrentTime() : 0;
    
    if (currentTime > 0) {
      this.lastKnownTime = currentTime;
    }
    
    this.replayer.pause();
    
    if (this.timeUpdateTimer) {
      clearInterval(this.timeUpdateTimer);
      this.timeUpdateTimer = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // 버튼을 재생 모드로 변경
    const playBtn = this.contentElement.querySelector('.play-btn');
    if (playBtn) {
      playBtn.textContent = '▶';
    }
    
    this.updateUI();
  }
  
  setSpeed(speed) {
    if (!this.replayer) return;
    this.playbackSpeed = parseFloat(speed);
    this.replayer.setConfig({ speed: this.playbackSpeed });
    
    // 재생 중이면 타이머 재시작 (버튼 상태로 판단)
    const playBtn = this.contentElement.querySelector('.play-btn');
    const isPlaying = playBtn?.textContent === '⏸';
    if (isPlaying) {
      this.startTimeUpdate();
    }
  }
  
  seekTo(percentage) {
    if (!this.replayer || !this.duration) return;
    
    // percentage를 ms로 변환
    const targetTime = Math.floor((percentage / 100) * this.duration);
    
    // 현재 재생 상태 확인 (버튼 상태로 판단)
    const playBtn = this.contentElement.querySelector('.play-btn');
    const wasPlaying = playBtn?.textContent === '⏸';
    
    // 타이머 정지
    if (this.timeUpdateTimer) {
      clearInterval(this.timeUpdateTimer);
      this.timeUpdateTimer = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // rrweb의 goto 메서드 사용
    if (this.replayer.goto) {
      this.replayer.goto(targetTime);
    } else {
      // goto가 없으면 pause(time) 시도
      this.replayer.pause();
      this.replayer.pause(targetTime);
    }
    
    // 시간 저장
    this.lastKnownTime = targetTime;
    
    // UI 즉시 업데이트
    this.updateUI();
    
    // 재생 중이었다면 다시 재생
    if (wasPlaying) {
      setTimeout(() => {
        this.play();
      }, 100);
    }
  }
  
  startTimeUpdate() {
    // 이전 타이머 정리
    if (this.timeUpdateTimer) {
      clearInterval(this.timeUpdateTimer);
      this.timeUpdateTimer = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // requestAnimationFrame을 사용한 부드러운 업데이트
    const updateFrame = () => {
      if (!this.replayer) return;
      
      // 버튼 상태로 재생 중인지 확인
      const playBtn = this.contentElement.querySelector('.play-btn');
      const isPlaying = playBtn?.textContent === '⏸';
      if (!isPlaying) return;
      
      // UI 업데이트
      this.updateUI();
      
      // 다음 프레임 예약
      this.animationFrameId = requestAnimationFrame(updateFrame);
    };
    
    // 시작
    this.animationFrameId = requestAnimationFrame(updateFrame);
  }
  
  addCustomControls(container) {
    // 컨트롤 바 생성
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'custom-controls';
    controlsDiv.style.cssText = `
      width: 100%;
      background: rgba(28, 28, 28, 0.98);
      padding: 12px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    `;
    
    // Progress Bar 컨테이너
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    progressContainer.style.cssText = `
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
    `;
    
    // Progress Bar (진행 표시)
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.style.cssText = `
      height: 100%;
      background: linear-gradient(90deg, #ff0000 0%, #ff4444 100%);
      width: 0%;
      border-radius: 3px;
      transition: width 0.1s linear;
      position: relative;
      pointer-events: none;  // 클릭 이벤트가 부모로 전달되도록
    `;
    
    // Progress Thumb (슬라이더)
    const progressThumb = document.createElement('div');
    progressThumb.className = 'progress-thumb';
    progressThumb.style.cssText = `
      position: absolute;
      right: -6px;
      top: 50%;
      transform: translateY(-50%);
      width: 12px;
      height: 12px;
      background: white;
      border-radius: 50%;
      box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;  // 클릭 이벤트가 부모로 전달되도록
    `;
    progressBar.appendChild(progressThumb);
    
    // Progress Bar hover 효과
    progressContainer.onmouseover = () => {
      progressContainer.style.height = '8px';
      progressThumb.style.opacity = '1';
    };
    progressContainer.onmouseout = () => {
      progressContainer.style.height = '6px';
      progressThumb.style.opacity = '0';
    };
    
    // Progress Bar 클릭 및 드래그로 seek
    let isDragging = false;
    
    const calculatePercentage = (e, rect) => {
      const clickX = e.clientX - rect.left;
      return Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    };
    
    const updateProgressUI = (percentage) => {
      // UI만 업데이트 (실제 seek는 하지 않음)
      if (this.progressBar) {
        this.progressBar.style.width = `${percentage}%`;
      }
      const targetTime = Math.floor((percentage / 100) * this.duration);
      const currentTimeEl = this.contentElement.querySelector('.current-time');
      if (currentTimeEl) {
        currentTimeEl.textContent = this.formatTime(targetTime);
      }
    };
    
    const mouseMoveHandler = (e) => {
      if (isDragging) {
        const rect = progressContainer.getBoundingClientRect();
        const percentage = calculatePercentage(e, rect);
        updateProgressUI(percentage);
      }
    };
    
    const mouseUpHandler = (e) => {
      if (isDragging) {
        const rect = progressContainer.getBoundingClientRect();
        const percentage = calculatePercentage(e, rect);
        this.seekTo(percentage);
        isDragging = false;
      }
      // 이벤트 리스너 제거
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };
    
    progressContainer.onmousedown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const rect = progressContainer.getBoundingClientRect();
      const percentage = calculatePercentage(e, rect);
      
      // 즉시 클릭한 위치로 이동
      this.seekTo(percentage);
      
      // 드래그 모드 시작
      isDragging = true;
      
      // 드래그 이벤트 리스너 추가
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
    };
    
    progressContainer.appendChild(progressBar);
    
    // 컨트롤 버튼들 컨테이너
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = `
      display: flex;
      gap: 20px;
      align-items: center;
      justify-content: center;
    `;
    
    // 재생/일시정지 버튼
    const playBtn = document.createElement('button');
    playBtn.className = 'play-btn';
    playBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      cursor: pointer;
      font-size: 18px;
      padding: 8px 12px;
      border-radius: 6px;
      transition: all 0.2s;
    `;
    playBtn.textContent = '▶';
    playBtn.onmouseover = () => playBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    playBtn.onmouseout = () => playBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    playBtn.onclick = () => this.togglePlay();
    
    // 시간 표시
    const timeDisplay = document.createElement('div');
    timeDisplay.className = 'time-display';
    timeDisplay.style.cssText = `
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      font-family: monospace;
      min-width: 100px;
      text-align: center;
    `;
    timeDisplay.innerHTML = '<span class="current-time">0:00</span> / <span class="duration">0:00</span>';
    
    // 속도 선택
    const speedSelect = document.createElement('select');
    speedSelect.className = 'speed-select';
    speedSelect.style.cssText = `
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      outline: none;
    `;
    speedSelect.innerHTML = `
      <option value="0.5">0.5x</option>
      <option value="1" selected>1x</option>
      <option value="2">2x</option>
      <option value="4">4x</option>
    `;
    speedSelect.onchange = (e) => this.setSpeed(e.target.value);
    
    buttonsDiv.appendChild(playBtn);
    buttonsDiv.appendChild(timeDisplay);
    buttonsDiv.appendChild(speedSelect);
    
    // DOM 참조 저장
    this.progressBar = progressBar;
    this.progressContainer = progressContainer;
    
    controlsDiv.appendChild(progressContainer);
    controlsDiv.appendChild(buttonsDiv);
    container.appendChild(controlsDiv);
  }
  
  updateUI() {
    if (!this.replayer) return;
    
    // rrweb의 getCurrentTime으로 현재 시간 가져오기
    const currentTime = this.replayer.getCurrentTime ? this.replayer.getCurrentTime() : 0;
    
    // 유효한 시간이면 저장 (updateUI는 자주 호출되므로 로그 생략)
    if (currentTime > 0) {
      this.lastKnownTime = currentTime;
    }
    
    // Progress Bar 업데이트
    if (this.progressBar && this.duration > 0) {
      const percentage = (currentTime / this.duration) * 100;
      this.progressBar.style.width = `${percentage}%`;
    }
    
    // 시간 표시 업데이트
    const currentTimeEl = this.contentElement.querySelector('.current-time');
    const durationEl = this.contentElement.querySelector('.duration');
    
    if (currentTimeEl) {
      currentTimeEl.textContent = this.formatTime(currentTime);
    }
    if (durationEl) {
      durationEl.textContent = this.formatTime(this.duration);
    }
  }
  
  getProgressPercent() {
    if (!this.replayer || this.duration === 0) return 0;
    const currentTime = this.replayer.getCurrentTime ? this.replayer.getCurrentTime() : 0;
    return (currentTime / this.duration) * 100;
  }
  
  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  stopReplay() {
    if (this.timeUpdateTimer) {
      clearInterval(this.timeUpdateTimer);
      this.timeUpdateTimer = null;
    }
    
    if (this.replayer) {
      this.replayer.destroy();
      this.replayer = null;
    }
    
    // 컨테이너 정리
    const container = this.contentElement?.querySelector('#replay-frame');
    if (container) {
      container.innerHTML = '';
    }
  }
  
  renderError(message) {
    const html = LitHtml.html`
      <div class="error">
        ⚠️ ${message}
      </div>
    `;
    LitHtml.render(html, this.contentElement, { host: this });
  }
  
  renderNoData() {
    const html = LitHtml.html`
      <div class="no-data">
        📹 기록된 세션이 없습니다
      </div>
    `;
    LitHtml.render(html, this.contentElement, { host: this });
  }
}
