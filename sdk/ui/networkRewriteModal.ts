/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from "../utils/logger";

interface NetworkRequest {
  requestId: number;
  method: string;
  url: string;
  status?: number;
  timestamp?: number;
  responseData?: any;
  requestBody?: any;
}

export function createNetworkRewriteModal(
  networkData: Map<number, any>,
  onSaveRewrite: (
    url: string,
    method: string,
    status: number,
    response: any,
    queryString?: string,
    requestBody?: any,
  ) => void,
) {
  // 모달 오버레이 (티켓 모달과 통일)
  const overlay = document.createElement("div");
  overlay.setAttribute("data-remote-debugger-overlay", "true");
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // 모달 컨테이너
  const modal = document.createElement("div");
  modal.className = "remote-debug-network-rewrite-modal";
  modal.style.cssText = `
    background-color: #fff;
    border-radius: 8px;
    max-width: 900px;
    width: 90%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    position: relative;
  `;

  // 헤더
  const header = createModalHeader();

  // 컨텐츠 컨테이너 (스크롤 가능)
  const contentContainer = document.createElement("div");
  contentContainer.id = "modal-content";
  contentContainer.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px 24px;
  `;

  // 뷰 전환 함수
  const showListView = () => {
    const headerTitle = header.querySelector("h3");
    if (headerTitle) headerTitle.textContent = "Network Rewrite";

    // 리스트로 돌아올 때 헤더의 뒤로가기 버튼 제거
    const backBtn = header.querySelector("#header-back-btn");
    if (backBtn) {
      backBtn.remove();
    }

    // 리스트로 돌아올 때 하단 버튼 영역 제거
    const buttonsContainer = modal.querySelector(".edit-buttons-container");
    if (buttonsContainer) {
      buttonsContainer.remove();
    }

    contentContainer.innerHTML = "";
    const listView = createNetworkList(networkData, (item) => {
      showEditView(item, onSaveRewrite);
    });
    contentContainer.appendChild(listView);
  };

  const showEditView = (
    item: any,
    onSave: (
      url: string,
      method: string,
      status: number,
      response: any,
      queryString?: string,
      requestBody?: any,
    ) => void,
  ) => {
    // 디버깅: item 객체 확인
    console.log("[showEditView] Called with item:", item);
    console.log("[showEditView] item.rewriteRule:", item.rewriteRule);

    const headerTitle = header.querySelector("h3");
    if (headerTitle) headerTitle.textContent = "변조 규칙 설정";

    // 헤더에 뒤로가기 버튼 추가
    const existingBackBtn = header.querySelector("#header-back-btn");
    if (existingBackBtn) {
      existingBackBtn.remove();
    }

    const backBtn = document.createElement("button");
    backBtn.id = "header-back-btn";
    backBtn.textContent = "←";
    backBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 20px;
      color: #666;
      padding: 0;
      width: 30px;
      height: 30px;
      cursor: pointer;
      margin-right: 10px;
    `;
    backBtn.addEventListener("click", showListView);

    if (headerTitle && headerTitle.parentElement) {
      headerTitle.parentElement.insertBefore(backBtn, headerTitle);
    }

    contentContainer.innerHTML = "";
    const { content, buttons } = createEditView(item, onSave, showListView);
    contentContainer.appendChild(content);

    // 버튼 영역을 모달 하단에 고정
    if (modal.querySelector(".edit-buttons-container")) {
      modal.querySelector(".edit-buttons-container")?.remove();
    }
    modal.appendChild(buttons);
  };

  // 초기 뷰는 리스트
  showListView();

  // 모달 조립
  modal.appendChild(header);
  modal.appendChild(contentContainer);

  // 오버레이 클릭 시 모달 닫기
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });

  // 닫기 버튼 이벤트
  const closeBtn = header.querySelector("#close-modal-btn");
  closeBtn?.addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  overlay.appendChild(modal);
  return overlay;
}

function createModalHeader() {
  const header = document.createElement("div");
  Object.assign(header.style, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 24px 0",
    position: "sticky",
    top: "0",
    backgroundColor: "#fff",
    zIndex: "10",
    borderTopLeftRadius: "8px",
    borderTopRightRadius: "8px",
    marginBottom: "0",
  });

  const title = document.createElement("h2");
  title.textContent = "Network Rewrite";
  Object.assign(title.style, {
    margin: "0",
    fontSize: "20px",
    fontWeight: "bold",
    color: "#333",
  });

  const closeBtn = document.createElement("button");
  closeBtn.id = "close-modal-btn";
  closeBtn.textContent = "✕";
  Object.assign(closeBtn.style, {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#666",
    padding: "0",
    width: "30px",
    height: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  header.appendChild(title);
  header.appendChild(closeBtn);

  return header;
}

function createNetworkList(
  networkData: Map<number, any>,
  onEditClick: (item: any) => void,
) {
  const container = document.createElement("div");
  Object.assign(container.style, {
    padding: "0",
  });

  // 필터 섹션
  const filterSection = document.createElement("div");
  Object.assign(filterSection.style, {
    marginBottom: "16px",
    display: "flex",
    gap: "8px",
  });

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "🔍 URL 검색...";

  // Object.assign으로 스타일을 안전하게 적용
  Object.assign(searchInput.style, {
    flex: "1",
    padding: "10px 16px",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    fontSize: "14px",
    background: "white",
    color: "#374151",
    boxSizing: "border-box",
    WebkitAppearance: "none",
    MozAppearance: "none",
    appearance: "none",
    transition: "border-color 0.2s",
    outline: "none",
  });

  searchInput.addEventListener("focus", () => {
    searchInput.style.borderColor = "#3b82f6";
  });
  searchInput.addEventListener("blur", () => {
    searchInput.style.borderColor = "#e5e7eb";
  });

  filterSection.appendChild(searchInput);

  // 카드 컨테이너
  const cardsContainer = document.createElement("div");
  Object.assign(cardsContainer.style, {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  });

  // 네트워크 데이터를 배열로 변환하고 최근 순으로 정렬
  const allRequests: NetworkRequest[] = [];

  // sessionStorage에서 Rewrite 규칙 가져오기
  const rewriteRulesData = sessionStorage.getItem("REMOTE_DEBUG_MOCK_RULES");
  const rewriteRulesSet = new Set<string>(); // 중복 방지용

  if (rewriteRulesData) {
    try {
      const rewriteRules = JSON.parse(rewriteRulesData) as Array<[string, any]>;
      rewriteRules.forEach(([_, rule]) => {
        if (rule && rule.enabled) {
          const rewriteRequest: NetworkRequest & {
            hasRequestRewrite?: boolean;
            hasResponseRewrite?: boolean;
            rewriteRule?: any;
          } = {
            requestId: -1 * Date.now() + Math.random(), // 음수 ID로 Rewrite 표시
            method: rule.method,
            url: rule.url,
            status: rule.status || 200,
            timestamp: rule.createdAt || Date.now(),
            responseData: rule.response,
          };

          // 요청/응답 변조 상태 추가
          (rewriteRequest as any).hasRequestRewrite = !!(
            rule.queryString !== undefined || rule.requestBody !== undefined
          );
          (rewriteRequest as any).hasResponseRewrite = !!(
            rule.response !== undefined
          );
          (rewriteRequest as any).rewriteRule = rule;

          // 디버깅 로그
          console.log("[createNetworkList] rule from sessionStorage:", rule);
          console.log("[createNetworkList] rewriteRequest:", rewriteRequest);

          allRequests.push(rewriteRequest);
          rewriteRulesSet.add(`${rule.method}:${rule.url}`);
        }
      });
    } catch (e) {
      logger.rewrite.error("Failed to load rewrite rules:", e);
    }
  }

  // 기존 네트워크 데이터 추가 (Rewrite 규칙과 중복되지 않는 것만)
  networkData.forEach((data, requestId) => {
    // 실제 응답 데이터가 있는 요청만 추가
    if (data) {
      // 새로운 데이터 구조 처리
      if (data.url && data.method && data.status !== undefined) {
        const key = `${data.method}:${data.url.split("?")[0]}`;
        // Rewrite 규칙에 없는 경우만 추가
        if (!rewriteRulesSet.has(key)) {
          const requestData = {
            requestId,
            method: data.method,
            url: data.url,
            status: data.status,
            timestamp: data.timestamp || Date.now(),
            responseData: data.responseBody,
            requestBody: data.requestBody,
          };
          allRequests.push(requestData);
        }
      }
    }
  });

  // 중복 제거: method와 URL(querystring 제외)이 같은 요청은 최신 것만 유지
  const uniqueRequestsMap = new Map<string, NetworkRequest>();
  allRequests.forEach((request) => {
    // URL에서 querystring 제거
    const urlWithoutQuery = request.url.split("?")[0];
    const key = `${request.method}:${urlWithoutQuery}`;

    // 같은 키가 있으면 더 최신 것으로 교체 (timestamp 비교)
    const existing = uniqueRequestsMap.get(key);
    const requestTime = request.timestamp || 0;
    const existingTime = existing?.timestamp || 0;
    if (!existing || requestTime > existingTime) {
      uniqueRequestsMap.set(key, request);
    }
  });

  // Map을 배열로 변환
  const requests = Array.from(uniqueRequestsMap.values());

  // 정렬: Rewrite 항목을 최상단에, 그 다음 시간순
  requests.sort((a, b) => {
    const aIsRewriteed = a.requestId < 0;
    const bIsRewriteed = b.requestId < 0;

    // Rewrite 항목이 상단에 오도록
    if (aIsRewriteed && !bIsRewriteed) return -1;
    if (!aIsRewriteed && bIsRewriteed) return 1;

    // 같은 종류끼리는 최신순으로
    return (b.timestamp || 0) - (a.timestamp || 0);
  });

  // 최근 30개만 표시 (모바일 성능 고려)
  const recentRequests = requests.slice(0, 30);

  if (recentRequests.length === 0) {
    // 데이터가 없는 경우 안내 메시지
    const emptyMessage = document.createElement("div");
    Object.assign(emptyMessage.style, {
      textAlign: "center",
      padding: "40px 20px",
      color: "#9ca3af",
      fontSize: "14px",
      lineHeight: "1.5",
      background: "#f9fafb",
      borderRadius: "8px",
      border: "1px solid #e5e7eb",
    });

    emptyMessage.innerHTML = `
      <div style="margin-bottom: 8px; font-size: 16px;"></div>
      <div>아직 기록된 네트워크 요청이 없습니다.</div>
      <div style="margin-top: 4px; font-size: 13px; color: #9ca3af;">페이지를 사용하면서 발생하는 API 요청이 여기에 표시됩니다.</div>
    `;

    cardsContainer.appendChild(emptyMessage);
  } else {
    recentRequests.forEach((request) => {
      const item = {
        method: request.method,
        url: request.url,
        status: request.status || 200,
        type: "Fetch",
        responseData: request.responseData,
        requestBody: (request as any).requestBody,
        isRewriteed: request.requestId < 0, // 음수 ID는 Rewrite 규칙
        hasRequestRewrite: (request as any).hasRequestRewrite,
        hasResponseRewrite: (request as any).hasResponseRewrite,
        rewriteRule: (request as any).rewriteRule,
      };
      const card = createCardItem(item, onEditClick);
      cardsContainer.appendChild(card);
    });
  }

  container.appendChild(filterSection);
  container.appendChild(cardsContainer);

  // 검색 기능
  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.toLowerCase();
    const cards = cardsContainer.querySelectorAll(".network-card");

    cards.forEach((card) => {
      const text = card.textContent?.toLowerCase() || "";
      const htmlCard = card as HTMLElement;
      if (text.includes(searchTerm)) {
        htmlCard.style.display = "";
      } else {
        htmlCard.style.display = "none";
      }
    });
  });

  return container;
}

function createCardItem(
  item: {
    method: string;
    url: string;
    status: number;
    type: string;
    responseData?: any;
    isRewriteed?: boolean;
    hasRequestRewrite?: boolean;
    hasResponseRewrite?: boolean;
    rewriteRule?: any;
  },
  onEditClick: (item: any) => void,
) {
  const card = document.createElement("div");
  card.className = "network-card";
  card.style.cssText = `
    padding: 16px;
    background: ${item.isRewriteed ? "#fef3e2" : "white"};
    border: 1px solid ${item.isRewriteed ? "#fed7aa" : "#e5e7eb"};
    border-radius: 8px;
    transition: all 0.2s;
    cursor: pointer;
  `;

  // 호버 효과
  card.addEventListener("mouseenter", () => {
    card.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
    if (!item.isRewriteed) {
      card.style.backgroundColor = "#f9fafb";
    }
  });
  card.addEventListener("mouseleave", () => {
    card.style.boxShadow = "";
    card.style.backgroundColor = item.isRewriteed ? "#fef3e2" : "white";
  });

  const statusColor = getStatusColor(item.status);

  card.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <!-- Method 뱃지 -->
        <span style="
          font-weight: 600;
          color: ${getMethodColor(item.method)};
          font-size: 12px;
          background: ${getMethodBackground(item.method)};
          padding: 4px 8px;
          border-radius: 4px;
        ">${item.method}</span>
        
        <!-- Status 뱃지 -->
        <span style="
          font-weight: 600;
          color: ${statusColor};
          font-size: 12px;
          background: ${statusColor}15;
          padding: 4px 8px;
          border-radius: 4px;
        ">${item.status}</span>
        
        ${
          item.isRewriteed
            ? `
          ${
            item.hasRequestRewrite
              ? `
            <span style="
              background: #3b82f6;
              color: white;
              font-size: 11px;
              padding: 3px 6px;
              border-radius: 3px;
              font-weight: 600;
            ">REQ</span>
          `
              : ""
          }
          ${
            item.hasResponseRewrite
              ? `
            <span style="
              background: #ff6b35;
              color: white;
              font-size: 11px;
              padding: 3px 6px;
              border-radius: 3px;
              font-weight: 600;
            ">RES</span>
          `
              : ""
          }
          ${
            !item.hasRequestRewrite && !item.hasResponseRewrite
              ? `
            <span style="
              background: #9ca3af;
              color: white;
              font-size: 11px;
              padding: 3px 6px;
              border-radius: 3px;
              font-weight: 600;
            ">REWRITE</span>
          `
              : ""
          }
        `
            : ""
        }
      </div>
      
      <div style="display: flex; gap: 6px;">
        <button class="edit-btn" style="
          background: ${item.isRewriteed ? "#ff6b35" : "#3b82f6"};
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: opacity 0.2s;
        ">${item.isRewriteed ? "수정" : "설정"}</button>
        
        ${
          item.isRewriteed
            ? `
          <button class="disable-btn" style="
            background: #6b7280;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: opacity 0.2s;
          ">비활성</button>
        `
            : ""
        }
      </div>
    </div>
    
    <!-- URL 전체 표시 -->
    <div style="
      font-family: monospace;
      font-size: 13px;
      color: #4b5563;
      word-break: break-all;
      line-height: 1.4;
    ">${item.url}</div>
  `;

  // 편집 버튼 이벤트 (이벤트 버블링 방지)
  const editBtn = card.querySelector(".edit-btn");
  editBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    onEditClick(item);
  });

  // 비활성 버튼 이벤트 (이벤트 버블링 방지)
  const disableBtn = card.querySelector(".disable-btn");
  disableBtn?.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (confirm(`"${item.url}" Rewrite을 비활성화하시겠습니까?`)) {
      // Network 클래스에서 Rewrite 규칙 제거
      const { Network } = await import("../domain/network");
      Network.Rewrite.removeRule(item.url, item.method);

      // 성공 메시지 표시
      const successMsg = document.createElement("div");
      successMsg.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #6c757d;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10002;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        max-width: 90%;
      `;
      successMsg.textContent = "Rewrite이 비활성화되었습니다";
      document.body.appendChild(successMsg);

      setTimeout(() => {
        document.body.removeChild(successMsg);
        // 페이지 새로고침
        window.location.reload();
      }, 1500);
    }
  });

  // 카드 클릭 시 편집
  card.addEventListener("click", () => {
    onEditClick(item);
  });

  return card;
}

function createEditView(
  item: {
    method: string;
    url: string;
    status: number;
    responseData?: any;
    queryString?: string;
    requestBody?: any;
    rewriteRule?: any;
  },
  onSave: (
    url: string,
    method: string,
    status: number,
    response: any,
    queryString?: string,
    requestBody?: any,
  ) => void,
  onBack: () => void,
) {
  // 콘텐츠 컨테이너
  const container = document.createElement("div");
  container.style.cssText = `
    padding: 0 0 80px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;

  // 버튼 컨테이너 (별도 분리)
  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "edit-buttons-container";
  buttonsContainer.style.cssText = `
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    padding: 12px 20px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    z-index: 10;
  `;

  // 실제 응답 데이터 사용, 없으면 예시 데이터
  let defaultResponse = {};
  if (item.responseData) {
    // responseData가 문자열인 경우 파싱
    if (typeof item.responseData === "string") {
      try {
        defaultResponse = JSON.parse(item.responseData);
      } catch {
        defaultResponse = { response: item.responseData };
      }
    } else {
      defaultResponse = item.responseData;
    }
  }

  // 빈 객체인 경우 예시 데이터 제공
  if (Object.keys(defaultResponse).length === 0) {
    defaultResponse = {
      success: true,
      message: "Rewrite response example",
      data: {
        id: 1,
        name: "Example",
      },
    };
  }

  // 기존 Rewrite 규칙이 있는지 확인
  let existingRule = item.rewriteRule;
  if (!existingRule) {
    // item에 rewriteRule이 없으면, sessionStorage에서 직접 확인
    try {
      const rewriteRulesData = sessionStorage.getItem(
        "REMOTE_DEBUG_MOCK_RULES",
      );
      if (rewriteRulesData) {
        const rewriteRules = JSON.parse(rewriteRulesData) as Array<
          [string, any]
        >;
        const urlWithoutQuery = item.url.split("?")[0];
        const ruleKey = `${item.method.toUpperCase()}:${urlWithoutQuery}`;

        // 해당 규칙 찾기
        const foundRule = rewriteRules.find(([key, _]) => key === ruleKey);
        if (foundRule) {
          existingRule = foundRule[1];
        }

        console.log("[createEditView] Checking existing rule for:", ruleKey);
        console.log("[createEditView] Found existing rule:", existingRule);
      }
    } catch (e) {
      console.error("[createEditView] Error loading existing rule:", e);
    }
  }

  // 요청 바디 기본값 설정
  const defaultRequestBody =
    item.requestBody || existingRule?.requestBody || {};

  container.innerHTML = `
    <!-- 요청 정보 헤더 -->
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
      <span style="
        font-weight: 600;
        color: ${getMethodColor(item.method)};
        background: ${getMethodBackground(item.method)};
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
      ">${item.method}</span>
      <div style="
        flex: 1;
        font-family: monospace;
        font-size: 13px;
        color: #4b5563;
        word-break: break-all;
        line-height: 1.4;
      ">${item.url}</div>
    </div>
    
    <!-- 요청 탭 메뉴 -->
    <div style="display: flex; gap: 8px; margin: 16px 0 12px 0; border-bottom: 1px solid #e5e7eb;">
      <button class="tab-btn active" data-tab="request" style="
        padding: 8px 16px;
        background: none;
        border: none;
        font-size: 14px;
        font-weight: 500;
        color: #ff6b35;
        cursor: pointer;
        border-bottom: 2px solid #ff6b35;
        transition: all 0.2s;
      ">요청 변조</button>
      <button class="tab-btn" data-tab="response" style="
        padding: 8px 16px;
        background: none;
        border: none;
        font-size: 14px;
        font-weight: 500;
        color: #6b7280;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
      ">응답 변조</button>
    </div>
    
    <!-- 요청 변조 섹션 -->
    <div id="request-section" style="display: block;">
      <!-- Query String 편집 -->
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151; font-size: 14px;">
          Query String:
        </label>
        <div id="querystring-container"></div>
      </div>
      
      <!-- Request Body 편집 -->
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151; font-size: 14px;">
          Request Body (JSON):
        </label>
        <div id="request-body-container"></div>
      </div>
    </div>
    
    <!-- 응답 변조 섹션 -->
    <div id="response-section" style="display: none;">
      <!-- HTTP 상태 코드 편집 -->
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151; font-size: 14px;">
          HTTP 상태 코드:
        </label>
        <div id="select-container"></div>
      </div>
      
      <!-- 응답 본문 편집 -->
      <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151; font-size: 14px;">
        응답 본문 (Response Body):
      </label>
      <div id="textarea-container"></div>
    </div>
  `;

  // 버튼들을 별도 컨테이너에 추가
  buttonsContainer.innerHTML = `
    <button id="cancel-edit" style="
      padding: 10px 20px;
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    ">취소</button>
    <button id="save-edit" style="
      padding: 10px 20px;
      background: #ff6b35;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.2s;
    ">요청 변조 활성화</button>
  `;

  // Query String input을 프로그래밍적으로 생성
  const queryStringContainer = container.querySelector(
    "#querystring-container",
  );
  console.log("[Query String Container] Found:", !!queryStringContainer);

  if (queryStringContainer) {
    const queryStringInput = document.createElement("input");
    queryStringInput.type = "text";
    queryStringInput.id = "querystring-editor";
    queryStringInput.placeholder = "예: ?param1=value1&param2=value2";

    // 기본값 설정 - 우선순위별로 확인
    let defaultQueryString = "";

    // 1. 기존 규칙에서 가져오기
    if (
      existingRule?.queryString !== undefined &&
      existingRule.queryString !== null
    ) {
      defaultQueryString = existingRule.queryString;
      console.log(
        "[Query String] Using existingRule.queryString:",
        defaultQueryString,
      );
    }
    // 2. item에서 가져오기
    else if (item.queryString !== undefined && item.queryString !== null) {
      defaultQueryString = item.queryString;
      console.log("[Query String] Using item.queryString:", defaultQueryString);
    }
    // 3. URL에서 추출
    else if (item.url.includes("?")) {
      defaultQueryString = item.url.substring(item.url.indexOf("?"));
      console.log("[Query String] Using URL query:", defaultQueryString);
    }

    // 디버깅 로그
    console.log("[Query String] item:", item);
    console.log("[Query String] existingRule:", existingRule);
    console.log("[Query String] Final defaultQueryString:", defaultQueryString);

    queryStringInput.value = defaultQueryString;

    Object.assign(queryStringInput.style, {
      width: "100%",
      padding: "10px 12px",
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      fontSize: "14px",
      fontFamily: "monospace",
      transition: "border-color 0.2s",
      outline: "none",
      background: "white",
      color: "#374151",
      boxSizing: "border-box",
      WebkitAppearance: "none",
      MozAppearance: "none",
      appearance: "none",
    });

    queryStringInput.addEventListener("focus", () => {
      queryStringInput.style.borderColor = "#3b82f6";
    });
    queryStringInput.addEventListener("blur", () => {
      queryStringInput.style.borderColor = "#e5e7eb";
    });

    queryStringContainer.appendChild(queryStringInput);
  }

  // 탭 전환 로직 추가
  const tabButtons = container.querySelectorAll(".tab-btn");
  const requestSection = container.querySelector("#request-section");
  const responseSection = container.querySelector("#response-section");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = (btn as HTMLElement).dataset.tab;
      console.log("[Tab Switch] Switching to:", targetTab);

      // 모든 탭 버튼 비활성화
      tabButtons.forEach((b) => {
        (b as HTMLElement).style.color = "#6b7280";
        (b as HTMLElement).style.borderBottomColor = "transparent";
        b.classList.remove("active");
      });

      // 클릭한 탭 활성화
      (btn as HTMLElement).style.color = "#ff6b35";
      (btn as HTMLElement).style.borderBottomColor = "#ff6b35";
      btn.classList.add("active");

      // 저장 버튼 텍스트 업데이트
      const saveBtn = document.querySelector("#save-edit");
      if (saveBtn) {
        if (targetTab === "request") {
          saveBtn.textContent = "요청 변조 활성화";
        } else {
          saveBtn.textContent = "응답 변조 활성화";
        }
      }

      // 섹션 표시/숨기기
      if (targetTab === "request" && requestSection && responseSection) {
        (requestSection as HTMLElement).style.display = "block";
        (responseSection as HTMLElement).style.display = "none";
        console.log("[Tab Switch] Request section displayed");
      } else if (
        targetTab === "response" &&
        requestSection &&
        responseSection
      ) {
        (requestSection as HTMLElement).style.display = "none";
        (responseSection as HTMLElement).style.display = "block";
        console.log("[Tab Switch] Response section displayed");
      }
    });
  });

  // Request Body 텍스트 영역 추가
  const requestBodyContainer = container.querySelector(
    "#request-body-container",
  );
  if (requestBodyContainer) {
    const requestBodyTextarea = document.createElement("textarea");
    requestBodyTextarea.id = "request-body-editor";

    // Request Body 값 설정
    let requestBodyValue = "";

    // 기존 규칙이나 아이템에서 Request Body 가져오기
    let actualRequestBody = null;
    if (existingRule?.requestBody !== undefined) {
      actualRequestBody = existingRule.requestBody;
    } else if (item.requestBody !== undefined) {
      actualRequestBody = item.requestBody;
    } else if (
      defaultRequestBody &&
      Object.keys(defaultRequestBody).length > 0
    ) {
      actualRequestBody = defaultRequestBody;
    }

    // Request Body를 문자열로 변환
    if (actualRequestBody !== null && actualRequestBody !== undefined) {
      if (typeof actualRequestBody === "string") {
        requestBodyValue = actualRequestBody;
      } else if (typeof actualRequestBody === "object") {
        requestBodyValue = JSON.stringify(actualRequestBody, null, 2);
      }
    }

    console.log("[Request Body] item.requestBody:", item.requestBody);
    console.log(
      "[Request Body] existingRule?.requestBody:",
      existingRule?.requestBody,
    );
    console.log("[Request Body] defaultRequestBody:", defaultRequestBody);
    console.log("[Request Body] actualRequestBody:", actualRequestBody);
    console.log("[Request Body] requestBodyValue:", requestBodyValue);

    requestBodyTextarea.value = requestBodyValue;

    Object.assign(requestBodyTextarea.style, {
      width: "100%",
      height: "200px",
      padding: "12px",
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      fontSize: "13px",
      fontFamily: "monospace",
      lineHeight: "1.5",
      resize: "vertical",
      boxSizing: "border-box",
      WebkitAppearance: "none",
      MozAppearance: "none",
      appearance: "none",
      transition: "border-color 0.2s",
      outline: "none",
      background: "white",
      color: "#374151",
    });

    requestBodyTextarea.addEventListener("focus", () => {
      requestBodyTextarea.style.borderColor = "#3b82f6";
    });
    requestBodyTextarea.addEventListener("blur", () => {
      requestBodyTextarea.style.borderColor = "#e5e7eb";
    });

    requestBodyContainer.appendChild(requestBodyTextarea);
  }

  // select 요소를 프로그래밍적으로 생성 - container 내에서 찾기
  const selectContainer = container.querySelector("#select-container");
  if (selectContainer) {
    const select = document.createElement("select");
    select.id = "status-editor";

    // 스타일 적용
    Object.assign(select.style, {
      width: "100%",
      padding: "10px 12px",
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      fontSize: "14px",
      background: "white",
      color: "#374151",
      cursor: "pointer",
      transition: "border-color 0.2s",
      outline: "none",
    });

    select.addEventListener("focus", () => {
      select.style.borderColor = "#3b82f6";
    });
    select.addEventListener("blur", () => {
      select.style.borderColor = "#e5e7eb";
    });

    // 옵션 데이터
    const optionGroups = [
      {
        label: "성공 (2xx)",
        options: [
          { value: 200, text: "200 OK" },
          { value: 201, text: "201 Created" },
          { value: 204, text: "204 No Content" },
        ],
      },
      {
        label: "리다이렉션 (3xx)",
        options: [
          { value: 301, text: "301 Moved Permanently" },
          { value: 302, text: "302 Found" },
          { value: 304, text: "304 Not Modified" },
        ],
      },
      {
        label: "클라이언트 에러 (4xx)",
        options: [
          { value: 400, text: "400 Bad Request" },
          { value: 401, text: "401 Unauthorized" },
          { value: 403, text: "403 Forbidden" },
          { value: 404, text: "404 Not Found" },
          { value: 409, text: "409 Conflict" },
          { value: 422, text: "422 Unprocessable Entity" },
        ],
      },
      {
        label: "서버 에러 (5xx)",
        options: [
          { value: 500, text: "500 Internal Server Error" },
          { value: 502, text: "502 Bad Gateway" },
          { value: 503, text: "503 Service Unavailable" },
          { value: 504, text: "504 Gateway Timeout" },
        ],
      },
    ];

    // 옵션 그룹과 옵션 생성
    optionGroups.forEach((group) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = group.label;

      group.options.forEach((optData) => {
        const option = document.createElement("option");
        option.value = String(optData.value);
        option.textContent = optData.text;

        // 현재 상태 코드와 일치하면 선택
        if (optData.value === item.status) {
          option.selected = true;
        }

        optgroup.appendChild(option);
      });

      select.appendChild(optgroup);
    });

    // 현재 상태 코드 설정
    select.value = String(item.status || 200);

    // 컨테이너에 추가
    selectContainer.appendChild(select);
  }

  // textarea를 프로그래밍적으로 생성하여 값 설정 문제 해결 - container 내에서 찾기
  const textareaContainer = container.querySelector("#textarea-container");
  if (textareaContainer) {
    // textarea 요소 생성
    const textarea = document.createElement("textarea");
    textarea.id = "response-editor";

    // 스타일 적용
    Object.assign(textarea.style, {
      width: "100%",
      height: "250px",
      fontFamily: "monospace",
      fontSize: "13px",
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      padding: "12px",
      background: "white",
      color: "#374151",
      lineHeight: "1.5",
      resize: "vertical",
      boxSizing: "border-box",
      WebkitAppearance: "none",
      MozAppearance: "none",
      appearance: "none",
      transition: "border-color 0.2s",
      outline: "none",
    });

    textarea.addEventListener("focus", () => {
      textarea.style.borderColor = "#3b82f6";
    });
    textarea.addEventListener("blur", () => {
      textarea.style.borderColor = "#e5e7eb";
    });

    // 값 설정 - createElement로 생성한 요소는 value 설정이 확실함
    const jsonString = JSON.stringify(defaultResponse, null, 2);
    textarea.value = jsonString;

    // 컨테이너에 추가
    textareaContainer.appendChild(textarea);
  }

  // 이벤트 핸들러 (DOM이 준비된 후 실행)
  setTimeout(() => {
    buttonsContainer
      .querySelector("#cancel-edit")
      ?.addEventListener("click", onBack);

    buttonsContainer
      .querySelector("#save-edit")
      ?.addEventListener("click", () => {
        const textarea =
          container.querySelector<HTMLTextAreaElement>("#response-editor");
        const selectElement =
          container.querySelector<HTMLSelectElement>("#status-editor");
        const queryStringInput = container.querySelector<HTMLInputElement>(
          "#querystring-editor",
        );
        const requestBodyTextarea =
          container.querySelector<HTMLTextAreaElement>("#request-body-editor");

        if (!textarea || !selectElement) {
          alert("에디터를 찾을 수 없습니다.");
          return;
        }

        // 상태 코드 가져오기
        const statusCode = parseInt(selectElement.value);

        try {
          // 현재 활성화된 탭 확인
          const isRequestTabActive =
            container
              .querySelector(".tab-btn.active")
              ?.getAttribute("data-tab") === "request";

          // URL에서 querystring 제거하여 저장 (모든 querystring 변형에 대응)
          const urlWithoutQuery = item.url.split("?")[0];

          let queryString = undefined;
          let requestBody = undefined;
          let responseData = undefined;

          if (isRequestTabActive) {
            // 요청 탭이 활성화된 경우 - 요청만 변조
            queryString = queryStringInput?.value || "";
            if (queryString && !queryString.startsWith("?")) {
              queryString = "?" + queryString;
            }

            // Request Body 파싱
            if (requestBodyTextarea && requestBodyTextarea.value.trim()) {
              try {
                requestBody = JSON.parse(requestBodyTextarea.value);
              } catch {
                // JSON이 아닌 경우 문자열 그대로 사용
                requestBody = requestBodyTextarea.value;
              }
            }

            // 요청 변조가 실제로 있는지 확인
            if (!queryString && !requestBody) {
              alert(
                "요청 변조할 내용을 입력해주세요 (Query String 또는 Request Body)",
              );
              return;
            }

            console.log("[Save] Mode: Request Rewrite");
            console.log("[Save] Query String:", queryString);
            console.log("[Save] Request Body:", requestBody);
          } else {
            // 응답 탭이 활성화된 경우 - 응답만 변조
            if (!textarea.value.trim()) {
              alert("응답 데이터를 입력해주세요");
              return;
            }

            responseData = JSON.parse(textarea.value);

            console.log("[Save] Mode: Response Rewrite");
            console.log("[Save] Response Data:", responseData);
          }

          onSave(
            urlWithoutQuery,
            item.method,
            statusCode,
            responseData,
            queryString,
            requestBody,
          );

          // 성공 메시지 (토스트 스타일)
          const successMsg = document.createElement("div");
          successMsg.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff6b35;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10002;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        max-width: 90%;
      `;
          const modeText = isRequestTabActive ? "요청 변조" : "응답 변조";
          successMsg.textContent = `${modeText} 활성화됨`;
          document.body.appendChild(successMsg);

          setTimeout(() => {
            document.body.removeChild(successMsg);
            // 모달 닫기
            const overlay = document.querySelector(
              ".remote-debug-network-rewrite-modal",
            )?.parentElement;
            if (overlay) {
              overlay.remove();
            }
            // 페이지 새로고침하여 Rewrite 적용
            window.location.reload();
          }, 1500);
        } catch (e) {
          alert("유효한 JSON 형식이 아닙니다.");
        }
      });
  }, 0);

  return { content: container, buttons: buttonsContainer };
}

// 유틸리티 함수들
function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return "#28a745";
  if (status >= 300 && status < 400) return "#ffc107";
  if (status >= 400 && status < 500) return "#fd7e14";
  if (status >= 500) return "#dc3545";
  return "#6c757d";
}

function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: "#28a745",
    POST: "#007bff",
    PUT: "#ffc107",
    DELETE: "#dc3545",
    PATCH: "#17a2b8",
  };
  return colors[method] || "#6c757d";
}

function getMethodBackground(method: string): string {
  const colors: Record<string, string> = {
    GET: "#28a74520",
    POST: "#007bff20",
    PUT: "#ffc10720",
    DELETE: "#dc354520",
    PATCH: "#17a2b820",
  };
  return colors[method] || "#6c757d20";
}

// 애니메이션 스타일 추가
if (!document.getElementById("network-rewrite-modal-styles")) {
  const style = document.createElement("style");
  style.id = "network-rewrite-modal-styles";
  style.textContent = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `;
  document.head.appendChild(style);
}
