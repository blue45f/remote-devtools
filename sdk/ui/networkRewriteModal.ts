import { escapeHtml } from '../common/utils';
import { Network } from '../domain/network';
import { logger } from '../utils/logger';

import { tokens, injectKeyframeAnimations, getStatusColor, getMethodColor } from './theme';

import type { RewriteRule } from '../domain/network-rewrite';

interface NetworkRequest {
  requestId: number;
  method: string;
  url: string;
  status?: number;
  timestamp?: number;
  responseData?: unknown;
  requestBody?: unknown;
  queryString?: string;
  hasRequestRewrite?: boolean;
  hasResponseRewrite?: boolean;
  rewriteRule?: RewriteRule;
}

type SaveRewriteHandler = (
  url: string,
  method: string,
  status: number,
  response: unknown,
  queryString?: string,
  requestBody?: unknown,
) => void;

type NetworkDataEntry = {
  url?: string;
  method?: string;
  status?: number;
  timestamp?: number;
  responseBody?: unknown;
  requestBody?: unknown;
};

type NetworkCardItem = {
  method: string;
  url: string;
  status: number;
  type: string;
  responseData?: unknown;
  requestBody?: unknown;
  queryString?: string;
  isRewriteed?: boolean;
  hasRequestRewrite?: boolean;
  hasResponseRewrite?: boolean;
  rewriteRule?: RewriteRule;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNetworkDataEntry = (value: unknown): value is NetworkDataEntry => isRecord(value);

const isObjectWithKeys = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && Object.keys(value).length > 0;

export function createNetworkRewriteModal(
  networkData: Map<number, unknown>,
  onSaveRewrite: SaveRewriteHandler,
) {
  // Inject shared keyframe animations
  injectKeyframeAnimations();

  // Modal overlay
  const overlay = document.createElement('div');
  overlay.setAttribute('data-remote-debugger-overlay', 'true');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: ${tokens.color.bg.overlay};
    z-index: ${tokens.zIndex.overlay};
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Modal container
  const modal = document.createElement('div');
  modal.className = 'remote-debug-network-rewrite-modal';
  modal.style.cssText = `
    background-color: ${tokens.color.bg.surface};
    border: 1px solid ${tokens.color.border.subtle};
    border-radius: ${tokens.radius.lg};
    max-width: 900px;
    width: 92%;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: ${tokens.shadow.lg};
    position: relative;
    font-family: ${tokens.font.system};
    animation: rdtFadeIn 0.2s ease-out;
  `;

  // Header
  const header = createModalHeader();

  // Content container (scrollable)
  const contentContainer = document.createElement('div');
  contentContainer.id = 'modal-content';
  contentContainer.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px 24px;
  `;

  // View switching functions
  const showListView = () => {
    const headerTitle = header.querySelector('h3');
    if (headerTitle) headerTitle.textContent = 'Network Rewrite';

    // Remove back button when returning to list
    const backBtn = header.querySelector('#header-back-btn');
    if (backBtn) {
      backBtn.remove();
    }

    // Remove bottom buttons area when returning to list
    const buttonsContainer = modal.querySelector('.edit-buttons-container');
    if (buttonsContainer) {
      buttonsContainer.remove();
    }

    contentContainer.innerHTML = '';
    const listView = createNetworkList(networkData, (item) => {
      showEditView(item, onSaveRewrite);
    });
    contentContainer.appendChild(listView);
  };

  const showEditView = (item: NetworkCardItem, onSave: SaveRewriteHandler) => {
    // Debug: check item object
    logger.rewrite.debug('[showEditView] Called with item:', item);
    logger.rewrite.debug('[showEditView] item.rewriteRule:', item.rewriteRule);

    const headerTitle = header.querySelector('h3');
    if (headerTitle) headerTitle.textContent = 'Rewrite Configuration';

    // Add back button to header
    const existingBackBtn = header.querySelector('#header-back-btn');
    if (existingBackBtn) {
      existingBackBtn.remove();
    }

    const backBtn = document.createElement('button');
    backBtn.id = 'header-back-btn';
    backBtn.textContent = '\u2190';
    backBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 20px;
      color: ${tokens.color.text.dim};
      padding: 0;
      width: 30px;
      height: 30px;
      cursor: pointer;
      margin-right: 10px;
      transition: color ${tokens.transition.fast};
    `;
    backBtn.addEventListener('mouseenter', () => {
      backBtn.style.color = tokens.color.text.primary;
    });
    backBtn.addEventListener('mouseleave', () => {
      backBtn.style.color = tokens.color.text.dim;
    });
    backBtn.addEventListener('click', showListView);

    if (headerTitle && headerTitle.parentElement) {
      headerTitle.parentElement.insertBefore(backBtn, headerTitle);
    }

    contentContainer.innerHTML = '';
    const { content, buttons } = createEditView(item, onSave, showListView);
    contentContainer.appendChild(content);

    // Fix buttons area at modal bottom
    if (modal.querySelector('.edit-buttons-container')) {
      modal.querySelector('.edit-buttons-container')?.remove();
    }
    modal.appendChild(buttons);
  };

  // Initial view is the list
  showListView();

  // Assemble modal
  modal.appendChild(header);
  modal.appendChild(contentContainer);

  // Close modal on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });

  // Close button event
  const closeBtn = header.querySelector('#close-modal-btn');
  closeBtn?.addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  overlay.appendChild(modal);
  return overlay;
}

function createModalHeader() {
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 24px 0',
    position: 'sticky',
    top: '0',
    backgroundColor: tokens.color.bg.surface,
    zIndex: '10',
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    marginBottom: '0',
  });

  const title = document.createElement('h2');
  title.textContent = 'Network Rewrite';
  Object.assign(title.style, {
    margin: '0',
    fontSize: '18px',
    fontWeight: '600',
    color: tokens.color.text.primary,
  });

  const closeBtn = document.createElement('button');
  closeBtn.id = 'close-modal-btn';
  closeBtn.textContent = '\u2715';
  Object.assign(closeBtn.style, {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: tokens.color.text.dim,
    padding: '0',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `color ${tokens.transition.fast}`,
  });

  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.color = tokens.color.text.primary;
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.color = tokens.color.text.dim;
  });

  header.appendChild(title);
  header.appendChild(closeBtn);

  return header;
}

function createNetworkList(
  networkData: Map<number, unknown>,
  onEditClick: (item: NetworkCardItem) => void,
) {
  const container = document.createElement('div');
  Object.assign(container.style, {
    padding: '0',
  });

  // Filter section
  const filterSection = document.createElement('div');
  Object.assign(filterSection.style, {
    marginBottom: '16px',
    display: 'flex',
    gap: '8px',
  });

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search requests...';

  Object.assign(searchInput.style, {
    flex: '1',
    padding: '10px 16px',
    border: `1px solid ${tokens.color.border.medium}`,
    borderRadius: tokens.radius.md,
    fontSize: '14px',
    background: tokens.color.bg.elevated,
    color: tokens.color.text.primary,
    boxSizing: 'border-box',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    appearance: 'none',
    transition: `border-color ${tokens.transition.normal}`,
    outline: 'none',
    fontFamily: tokens.font.system,
  });

  searchInput.addEventListener('focus', () => {
    searchInput.style.borderColor = tokens.color.accent.violet;
  });
  searchInput.addEventListener('blur', () => {
    searchInput.style.borderColor = tokens.color.border.medium;
  });

  filterSection.appendChild(searchInput);

  // Cards container
  const cardsContainer = document.createElement('div');
  Object.assign(cardsContainer.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  });

  // Convert network data to array and sort by most recent
  const allRequests: NetworkRequest[] = [];

  // Get rewrite rules from sessionStorage
  const rewriteRulesData = sessionStorage.getItem('REMOTE_DEBUG_MOCK_RULES');
  const rewriteRulesSet = new Set<string>(); // Dedup set

  if (rewriteRulesData) {
    try {
      const rewriteRules = JSON.parse(rewriteRulesData) as Array<[string, RewriteRule]>;
      rewriteRules.forEach(([_, rule]) => {
        if (rule && rule.enabled) {
          const rewriteRequest: NetworkRequest = {
            requestId: -1 * Date.now() + Math.random(), // Negative ID for rewrite marker
            method: rule.method,
            url: rule.url,
            status: rule.status || 200,
            timestamp: rule.createdAt || Date.now(),
            responseData: rule.response,
            requestBody: rule.requestBody,
            queryString: rule.queryString,
            hasRequestRewrite: rule.queryString !== undefined || rule.requestBody !== undefined,
            hasResponseRewrite: rule.response !== undefined,
            rewriteRule: rule,
          };

          // Debug logs
          logger.rewrite.debug('[createNetworkList] rule from sessionStorage:', rule);
          logger.rewrite.debug('[createNetworkList] rewriteRequest:', rewriteRequest);

          allRequests.push(rewriteRequest);
          rewriteRulesSet.add(`${rule.method}:${rule.url}`);
        }
      });
    } catch (e) {
      logger.rewrite.error('Failed to load rewrite rules:', e);
    }
  }

  // Add existing network data (only those not duplicated by rewrite rules)
  networkData.forEach((data, requestId) => {
    // Only add requests with actual response data
    if (isNetworkDataEntry(data)) {
      // Handle new data structure
      if (
        typeof data.url === 'string' &&
        typeof data.method === 'string' &&
        data.status !== undefined
      ) {
        const key = `${data.method}:${data.url.split('?')[0]}`;
        // Only add if not in rewrite rules
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

  // Dedup: keep only the most recent request for same method + URL (without querystring)
  const uniqueRequestsMap = new Map<string, NetworkRequest>();
  allRequests.forEach((request) => {
    // Remove querystring from URL
    const urlWithoutQuery = request.url.split('?')[0];
    const key = `${request.method}:${urlWithoutQuery}`;

    // Replace with newer entry if same key exists
    const existing = uniqueRequestsMap.get(key);
    const requestTime = request.timestamp || 0;
    const existingTime = existing?.timestamp || 0;
    if (!existing || requestTime > existingTime) {
      uniqueRequestsMap.set(key, request);
    }
  });

  // Convert Map to array
  const requests = Array.from(uniqueRequestsMap.values());

  // Sort: rewrite items at top, then by time
  requests.sort((a, b) => {
    const aIsRewriteed = a.requestId < 0;
    const bIsRewriteed = b.requestId < 0;

    // Rewrite items float to top
    if (aIsRewriteed && !bIsRewriteed) return -1;
    if (!aIsRewriteed && bIsRewriteed) return 1;

    // Same kind sorted by most recent
    return (b.timestamp || 0) - (a.timestamp || 0);
  });

  // Show only the most recent 30 (mobile perf)
  const recentRequests = requests.slice(0, 30);

  if (recentRequests.length === 0) {
    // Empty state message
    const emptyMessage = document.createElement('div');
    Object.assign(emptyMessage.style, {
      textAlign: 'center',
      padding: '40px 20px',
      color: tokens.color.text.dim,
      fontSize: '14px',
      lineHeight: '1.5',
      background: tokens.color.bg.elevated,
      borderRadius: tokens.radius.md,
      border: `1px solid ${tokens.color.border.subtle}`,
    });

    emptyMessage.innerHTML = `
      <div style="margin-bottom: 8px; font-size: 16px;"></div>
      <div>No network requests recorded yet.</div>
      <div style="margin-top: 4px; font-size: 13px; color: ${tokens.color.text.dim};">API requests will appear here as you interact with the page.</div>
    `;

    cardsContainer.appendChild(emptyMessage);
  } else {
    recentRequests.forEach((request) => {
      const item = {
        method: request.method,
        url: request.url,
        status: request.status || 200,
        type: 'Fetch',
        responseData: request.responseData,
        requestBody: request.requestBody,
        isRewriteed: request.requestId < 0, // Negative ID = rewrite rule
        hasRequestRewrite: request.hasRequestRewrite,
        hasResponseRewrite: request.hasResponseRewrite,
        rewriteRule: request.rewriteRule,
      };
      const card = createCardItem(item, onEditClick);
      cardsContainer.appendChild(card);
    });
  }

  container.appendChild(filterSection);
  container.appendChild(cardsContainer);

  // Search functionality
  searchInput.addEventListener('input', () => {
    const searchTerm = searchInput.value.toLowerCase();
    const cards = cardsContainer.querySelectorAll('.network-card');

    cards.forEach((card) => {
      const text = card.textContent?.toLowerCase() || '';
      const htmlCard = card as HTMLElement;
      if (text.includes(searchTerm)) {
        htmlCard.style.display = '';
      } else {
        htmlCard.style.display = 'none';
      }
    });
  });

  return container;
}

function createCardItem(item: NetworkCardItem, onEditClick: (item: NetworkCardItem) => void) {
  const card = document.createElement('div');
  card.className = 'network-card';
  card.style.cssText = `
    padding: 16px;
    background: ${item.isRewriteed ? 'rgba(245, 158, 11, 0.08)' : tokens.color.bg.elevated};
    border: 1px solid ${item.isRewriteed ? 'rgba(245, 158, 11, 0.25)' : tokens.color.border.subtle};
    border-radius: ${tokens.radius.md};
    transition: all ${tokens.transition.normal};
    cursor: pointer;
  `;

  // Hover effect
  card.addEventListener('mouseenter', () => {
    card.style.boxShadow = tokens.shadow.sm;
    if (!item.isRewriteed) {
      card.style.backgroundColor = tokens.color.bg.hover;
    }
  });
  card.addEventListener('mouseleave', () => {
    card.style.boxShadow = '';
    card.style.backgroundColor = item.isRewriteed
      ? 'rgba(245, 158, 11, 0.08)'
      : tokens.color.bg.elevated;
  });

  const statusColor = getStatusColor(item.status);
  const methodColors = getMethodColor(item.method);

  card.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <!-- Method badge -->
        <span style="
          font-weight: 600;
          color: ${methodColors.text};
          font-size: 12px;
          background: ${methodColors.bg};
          padding: 4px 8px;
          border-radius: 4px;
        ">${escapeHtml(item.method)}</span>

        <!-- Status badge -->
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
              background: rgba(96, 165, 250, 0.15);
              color: #60a5fa;
              font-size: 11px;
              padding: 3px 6px;
              border-radius: 3px;
              font-weight: 600;
            ">REQ</span>
          `
              : ''
          }
          ${
            item.hasResponseRewrite
              ? `
            <span style="
              background: rgba(245, 158, 11, 0.15);
              color: #f59e0b;
              font-size: 11px;
              padding: 3px 6px;
              border-radius: 3px;
              font-weight: 600;
            ">RES</span>
          `
              : ''
          }
          ${
            !item.hasRequestRewrite && !item.hasResponseRewrite
              ? `
            <span style="
              background: rgba(161, 161, 170, 0.15);
              color: ${tokens.color.text.muted};
              font-size: 11px;
              padding: 3px 6px;
              border-radius: 3px;
              font-weight: 600;
            ">REWRITE</span>
          `
              : ''
          }
        `
            : ''
        }
      </div>

      <div style="display: flex; gap: 6px;">
        <button class="edit-btn" style="
          background: ${tokens.color.accent.violet};
          color: #fff;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: opacity ${tokens.transition.fast};
        ">${item.isRewriteed ? 'Edit' : 'Configure'}</button>

        ${
          item.isRewriteed
            ? `
          <button class="disable-btn" style="
            background: ${tokens.color.bg.hover};
            color: ${tokens.color.text.secondary};
            border: 1px solid ${tokens.color.border.medium};
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all ${tokens.transition.fast};
          ">Disable</button>
        `
            : ''
        }
      </div>
    </div>

    <!-- URL full display -->
    <div style="
      font-family: ${tokens.font.mono};
      font-size: 13px;
      color: ${tokens.color.text.muted};
      word-break: break-all;
      line-height: 1.4;
    ">${escapeHtml(item.url)}</div>
  `;

  // Edit button event (prevent event bubbling)
  const editBtn = card.querySelector('.edit-btn');
  editBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    onEditClick(item);
  });

  // Disable button event (prevent event bubbling)
  const disableBtn = card.querySelector('.disable-btn');
  disableBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm(`Disable rewrite for "${item.url}"?`)) {
      Network.Rewrite.removeRule(item.url, item.method);

      // Show success message
      const successMsg = document.createElement('div');
      successMsg.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${tokens.color.bg.surface};
        color: ${tokens.color.text.secondary};
        border: 1px solid ${tokens.color.border.subtle};
        padding: 12px 20px;
        border-radius: ${tokens.radius.sm};
        font-size: 14px;
        font-weight: 500;
        z-index: ${tokens.zIndex.toast};
        box-shadow: ${tokens.shadow.md};
        max-width: 90%;
        font-family: ${tokens.font.system};
      `;
      successMsg.textContent = 'Rewrite rule disabled';
      document.body.appendChild(successMsg);

      setTimeout(() => {
        document.body.removeChild(successMsg);
        // Reload page
        globalThis.location.reload();
      }, 1500);
    }
  });

  // Click card to edit
  card.addEventListener('click', () => {
    onEditClick(item);
  });

  return card;
}

function createEditView(item: NetworkCardItem, onSave: SaveRewriteHandler, onBack: () => void) {
  // Content container
  const container = document.createElement('div');
  container.style.cssText = `
    padding: 0 0 80px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;

  // Buttons container (separated)
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'edit-buttons-container';
  buttonsContainer.style.cssText = `
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    background: ${tokens.color.bg.surface};
    padding: 12px 20px;
    border-top: 1px solid ${tokens.color.border.subtle};
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
    z-index: 10;
  `;

  // Use actual response data, or example data if absent
  let defaultResponse: unknown = {};
  if (item.responseData) {
    // Parse if responseData is a string
    if (typeof item.responseData === 'string') {
      try {
        defaultResponse = JSON.parse(item.responseData);
      } catch {
        defaultResponse = { response: item.responseData };
      }
    } else {
      defaultResponse = item.responseData;
    }
  }

  // Provide example data if empty object
  if (!isObjectWithKeys(defaultResponse)) {
    defaultResponse = {
      success: true,
      message: 'Rewrite response example',
      data: {
        id: 1,
        name: 'Example',
      },
    };
  }

  // Check for existing rewrite rule
  let existingRule = item.rewriteRule;
  if (!existingRule) {
    // If item doesn't have rewriteRule, check sessionStorage directly
    try {
      const rewriteRulesData = sessionStorage.getItem('REMOTE_DEBUG_MOCK_RULES');
      if (rewriteRulesData) {
        const rewriteRules = JSON.parse(rewriteRulesData) as Array<[string, RewriteRule]>;
        const urlWithoutQuery = item.url.split('?')[0];
        const ruleKey = `${item.method.toUpperCase()}:${urlWithoutQuery}`;

        // Find the rule
        const foundRule = rewriteRules.find(([key, _]) => key === ruleKey);
        if (foundRule) {
          existingRule = foundRule[1];
        }

        logger.rewrite.debug('[createEditView] Checking existing rule for:', ruleKey);
        logger.rewrite.debug('[createEditView] Found existing rule:', existingRule);
      }
    } catch (e) {
      console.error('[createEditView] Error loading existing rule:', e);
    }
  }

  // Default request body value
  const defaultRequestBody = item.requestBody || existingRule?.requestBody || {};

  const methodColors = getMethodColor(item.method);

  container.innerHTML = `
    <!-- Request info header -->
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
      <span style="
        font-weight: 600;
        color: ${methodColors.text};
        background: ${methodColors.bg};
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
      ">${escapeHtml(item.method)}</span>
      <div style="
        flex: 1;
        font-family: ${tokens.font.mono};
        font-size: 13px;
        color: ${tokens.color.text.muted};
        word-break: break-all;
        line-height: 1.4;
      ">${escapeHtml(item.url)}</div>
    </div>

    <!-- Tab menu -->
    <div style="display: flex; gap: 8px; margin: 16px 0 12px 0; border-bottom: 1px solid ${tokens.color.border.subtle};">
      <button class="tab-btn active" data-tab="request" style="
        padding: 8px 16px;
        background: none;
        border: none;
        font-size: 14px;
        font-weight: 500;
        color: ${tokens.color.accent.violet};
        cursor: pointer;
        border-bottom: 2px solid ${tokens.color.accent.violet};
        transition: all ${tokens.transition.normal};
        font-family: ${tokens.font.system};
      ">Request</button>
      <button class="tab-btn" data-tab="response" style="
        padding: 8px 16px;
        background: none;
        border: none;
        font-size: 14px;
        font-weight: 500;
        color: ${tokens.color.text.dim};
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all ${tokens.transition.normal};
        font-family: ${tokens.font.system};
      ">Response</button>
    </div>

    <!-- Request rewrite section -->
    <div id="request-section" style="display: block;">
      <!-- Query String edit -->
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: ${tokens.color.text.muted}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.03em;">
          Query String
        </label>
        <div id="querystring-container"></div>
      </div>

      <!-- Request Body edit -->
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: ${tokens.color.text.muted}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.03em;">
          Request Body (JSON)
        </label>
        <div id="request-body-container"></div>
      </div>
    </div>

    <!-- Response rewrite section -->
    <div id="response-section" style="display: none;">
      <!-- HTTP status code edit -->
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: ${tokens.color.text.muted}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.03em;">
          HTTP Status Code
        </label>
        <div id="select-container"></div>
      </div>

      <!-- Response body edit -->
      <label style="display: block; margin-bottom: 6px; font-weight: 600; color: ${tokens.color.text.muted}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.03em;">
        Response Body
      </label>
      <div id="textarea-container"></div>
    </div>
  `;

  // Buttons in separate container
  buttonsContainer.innerHTML = `
    <button id="cancel-edit" style="
      padding: 10px 20px;
      background: ${tokens.color.bg.hover};
      color: ${tokens.color.text.secondary};
      border: 1px solid ${tokens.color.border.medium};
      border-radius: ${tokens.radius.sm};
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all ${tokens.transition.normal};
      font-family: ${tokens.font.system};
    ">Cancel</button>
    <button id="save-edit" style="
      padding: 10px 20px;
      background: linear-gradient(135deg, #7c3aed, #6366f1);
      color: #fff;
      border: none;
      border-radius: ${tokens.radius.sm};
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity ${tokens.transition.normal};
      font-family: ${tokens.font.system};
    ">Enable Request Rewrite</button>
  `;

  // Programmatically create Query String input
  const queryStringContainer = container.querySelector('#querystring-container');
  logger.rewrite.debug('[Query String Container] Found:', !!queryStringContainer);

  if (queryStringContainer) {
    const queryStringInput = document.createElement('input');
    queryStringInput.type = 'text';
    queryStringInput.id = 'querystring-editor';
    queryStringInput.placeholder = 'e.g. ?param1=value1&param2=value2';

    // Set default value - check by priority
    let defaultQueryString = '';

    // 1. Get from existing rule
    if (existingRule?.queryString !== undefined && existingRule.queryString !== null) {
      defaultQueryString = existingRule.queryString;
      logger.rewrite.debug('[Query String] Using existingRule.queryString:', defaultQueryString);
    }
    // 2. Get from item
    else if (item.queryString !== undefined && item.queryString !== null) {
      defaultQueryString = item.queryString;
      logger.rewrite.debug('[Query String] Using item.queryString:', defaultQueryString);
    }
    // 3. Extract from URL
    else if (item.url.includes('?')) {
      defaultQueryString = item.url.substring(item.url.indexOf('?'));
      logger.rewrite.debug('[Query String] Using URL query:', defaultQueryString);
    }

    // Debug logs
    logger.rewrite.debug('[Query String] item:', item);
    logger.rewrite.debug('[Query String] existingRule:', existingRule);
    logger.rewrite.debug('[Query String] Final defaultQueryString:', defaultQueryString);

    queryStringInput.value = defaultQueryString;

    Object.assign(queryStringInput.style, {
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${tokens.color.border.medium}`,
      borderRadius: tokens.radius.sm,
      fontSize: '14px',
      fontFamily: tokens.font.mono,
      transition: `border-color ${tokens.transition.normal}`,
      outline: 'none',
      background: tokens.color.bg.elevated,
      color: tokens.color.text.primary,
      boxSizing: 'border-box',
      WebkitAppearance: 'none',
      MozAppearance: 'none',
      appearance: 'none',
    });

    queryStringInput.addEventListener('focus', () => {
      queryStringInput.style.borderColor = tokens.color.accent.violet;
    });
    queryStringInput.addEventListener('blur', () => {
      queryStringInput.style.borderColor = tokens.color.border.medium;
    });

    queryStringContainer.appendChild(queryStringInput);
  }

  // Tab switching logic
  const tabButtons = container.querySelectorAll('.tab-btn');
  const requestSection = container.querySelector('#request-section');
  const responseSection = container.querySelector('#response-section');

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = (btn as HTMLElement).dataset.tab;
      logger.rewrite.debug('[Tab Switch] Switching to:', targetTab);

      // Deactivate all tab buttons
      tabButtons.forEach((b) => {
        (b as HTMLElement).style.color = tokens.color.text.dim;
        (b as HTMLElement).style.borderBottomColor = 'transparent';
        b.classList.remove('active');
      });

      // Activate clicked tab
      (btn as HTMLElement).style.color = tokens.color.accent.violet;
      (btn as HTMLElement).style.borderBottomColor = tokens.color.accent.violet;
      btn.classList.add('active');

      // Update save button text
      const saveBtn = document.querySelector('#save-edit');
      if (saveBtn) {
        if (targetTab === 'request') {
          saveBtn.textContent = 'Enable Request Rewrite';
        } else {
          saveBtn.textContent = 'Enable Response Rewrite';
        }
      }

      // Show/hide sections
      if (targetTab === 'request' && requestSection && responseSection) {
        (requestSection as HTMLElement).style.display = 'block';
        (responseSection as HTMLElement).style.display = 'none';
        logger.rewrite.debug('[Tab Switch] Request section displayed');
      } else if (targetTab === 'response' && requestSection && responseSection) {
        (requestSection as HTMLElement).style.display = 'none';
        (responseSection as HTMLElement).style.display = 'block';
        logger.rewrite.debug('[Tab Switch] Response section displayed');
      }
    });
  });

  // Request Body textarea
  const requestBodyContainer = container.querySelector('#request-body-container');
  if (requestBodyContainer) {
    const requestBodyTextarea = document.createElement('textarea');
    requestBodyTextarea.id = 'request-body-editor';

    // Set Request Body value
    let requestBodyValue = '';

    // Get Request Body from existing rule or item
    let actualRequestBody: unknown = null;
    if (existingRule?.requestBody !== undefined) {
      actualRequestBody = existingRule.requestBody;
    } else if (item.requestBody !== undefined) {
      actualRequestBody = item.requestBody;
    } else if (defaultRequestBody && isObjectWithKeys(defaultRequestBody)) {
      actualRequestBody = defaultRequestBody;
    }

    // Convert Request Body to string
    if (actualRequestBody !== null && actualRequestBody !== undefined) {
      if (typeof actualRequestBody === 'string') {
        requestBodyValue = actualRequestBody;
      } else if (typeof actualRequestBody === 'object') {
        requestBodyValue = JSON.stringify(actualRequestBody, null, 2);
      }
    }

    logger.rewrite.debug('[Request Body] item.requestBody:', item.requestBody);
    logger.rewrite.debug('[Request Body] existingRule?.requestBody:', existingRule?.requestBody);
    logger.rewrite.debug('[Request Body] defaultRequestBody:', defaultRequestBody);
    logger.rewrite.debug('[Request Body] actualRequestBody:', actualRequestBody);
    logger.rewrite.debug('[Request Body] requestBodyValue:', requestBodyValue);

    requestBodyTextarea.value = requestBodyValue;

    Object.assign(requestBodyTextarea.style, {
      width: '100%',
      height: '200px',
      padding: '12px',
      border: `1px solid ${tokens.color.border.medium}`,
      borderRadius: tokens.radius.sm,
      fontSize: '13px',
      fontFamily: tokens.font.mono,
      lineHeight: '1.5',
      resize: 'vertical',
      boxSizing: 'border-box',
      WebkitAppearance: 'none',
      MozAppearance: 'none',
      appearance: 'none',
      transition: `border-color ${tokens.transition.normal}`,
      outline: 'none',
      background: tokens.color.bg.elevated,
      color: tokens.color.text.primary,
    });

    requestBodyTextarea.addEventListener('focus', () => {
      requestBodyTextarea.style.borderColor = tokens.color.accent.violet;
    });
    requestBodyTextarea.addEventListener('blur', () => {
      requestBodyTextarea.style.borderColor = tokens.color.border.medium;
    });

    requestBodyContainer.appendChild(requestBodyTextarea);
  }

  // Programmatically create select element - find within container
  const selectContainer = container.querySelector('#select-container');
  if (selectContainer) {
    const select = document.createElement('select');
    select.id = 'status-editor';

    // Apply styles
    Object.assign(select.style, {
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${tokens.color.border.medium}`,
      borderRadius: tokens.radius.sm,
      fontSize: '14px',
      background: tokens.color.bg.elevated,
      color: tokens.color.text.primary,
      cursor: 'pointer',
      transition: `border-color ${tokens.transition.normal}`,
      outline: 'none',
      fontFamily: tokens.font.system,
    });

    select.addEventListener('focus', () => {
      select.style.borderColor = tokens.color.accent.violet;
    });
    select.addEventListener('blur', () => {
      select.style.borderColor = tokens.color.border.medium;
    });

    // Option data
    const optionGroups = [
      {
        label: 'Success (2xx)',
        options: [
          { value: 200, text: '200 OK' },
          { value: 201, text: '201 Created' },
          { value: 204, text: '204 No Content' },
        ],
      },
      {
        label: 'Redirect (3xx)',
        options: [
          { value: 301, text: '301 Moved Permanently' },
          { value: 302, text: '302 Found' },
          { value: 304, text: '304 Not Modified' },
        ],
      },
      {
        label: 'Client Error (4xx)',
        options: [
          { value: 400, text: '400 Bad Request' },
          { value: 401, text: '401 Unauthorized' },
          { value: 403, text: '403 Forbidden' },
          { value: 404, text: '404 Not Found' },
          { value: 409, text: '409 Conflict' },
          { value: 422, text: '422 Unprocessable Entity' },
        ],
      },
      {
        label: 'Server Error (5xx)',
        options: [
          { value: 500, text: '500 Internal Server Error' },
          { value: 502, text: '502 Bad Gateway' },
          { value: 503, text: '503 Service Unavailable' },
          { value: 504, text: '504 Gateway Timeout' },
        ],
      },
    ];

    // Create option groups and options
    optionGroups.forEach((group) => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = group.label;

      group.options.forEach((optData) => {
        const option = document.createElement('option');
        option.value = String(optData.value);
        option.textContent = optData.text;

        // Select if matching current status code
        if (optData.value === item.status) {
          option.selected = true;
        }

        optgroup.appendChild(option);
      });

      select.appendChild(optgroup);
    });

    // Set current status code
    select.value = String(item.status || 200);

    // Add to container
    selectContainer.appendChild(select);
  }

  // Programmatically create textarea for response editor - find within container
  const textareaContainer = container.querySelector('#textarea-container');
  if (textareaContainer) {
    // Create textarea element
    const textarea = document.createElement('textarea');
    textarea.id = 'response-editor';

    // Apply styles
    Object.assign(textarea.style, {
      width: '100%',
      height: '250px',
      fontFamily: tokens.font.mono,
      fontSize: '13px',
      border: `1px solid ${tokens.color.border.medium}`,
      borderRadius: tokens.radius.sm,
      padding: '12px',
      background: tokens.color.bg.elevated,
      color: tokens.color.text.primary,
      lineHeight: '1.5',
      resize: 'vertical',
      boxSizing: 'border-box',
      WebkitAppearance: 'none',
      MozAppearance: 'none',
      appearance: 'none',
      transition: `border-color ${tokens.transition.normal}`,
      outline: 'none',
    });

    textarea.addEventListener('focus', () => {
      textarea.style.borderColor = tokens.color.accent.violet;
    });
    textarea.addEventListener('blur', () => {
      textarea.style.borderColor = tokens.color.border.medium;
    });

    // Set value - createElement ensures value assignment works reliably
    const jsonString = JSON.stringify(defaultResponse, null, 2);
    textarea.value = jsonString;

    // Add to container
    textareaContainer.appendChild(textarea);
  }

  // Event handlers (run after DOM is ready)
  setTimeout(() => {
    buttonsContainer.querySelector('#cancel-edit')?.addEventListener('click', onBack);

    buttonsContainer.querySelector('#save-edit')?.addEventListener('click', () => {
      const textarea = container.querySelector<HTMLTextAreaElement>('#response-editor');
      const selectElement = container.querySelector<HTMLSelectElement>('#status-editor');
      const queryStringInput = container.querySelector<HTMLInputElement>('#querystring-editor');
      const requestBodyTextarea =
        container.querySelector<HTMLTextAreaElement>('#request-body-editor');

      if (!textarea || !selectElement) {
        alert('Editor not found.');
        return;
      }

      // Get status code
      const statusCode = parseInt(selectElement.value);

      try {
        // Check which tab is active
        const isRequestTabActive =
          container.querySelector('.tab-btn.active')?.getAttribute('data-tab') === 'request';

        // Remove querystring from URL for saving (handle all querystring variations)
        const urlWithoutQuery = item.url.split('?')[0];

        let queryString: string | undefined = undefined;
        let requestBody: unknown = undefined;
        let responseData: unknown = undefined;

        if (isRequestTabActive) {
          // Request tab active - rewrite request only
          queryString = queryStringInput?.value || '';
          if (queryString && !queryString.startsWith('?')) {
            queryString = '?' + queryString;
          }

          // Parse Request Body
          if (requestBodyTextarea && requestBodyTextarea.value.trim()) {
            try {
              requestBody = JSON.parse(requestBodyTextarea.value);
            } catch {
              // Use as string if not valid JSON
              requestBody = requestBodyTextarea.value;
            }
          }

          // Check if there is actual request rewrite content
          if (!queryString && !requestBody) {
            alert('Enter rewrite content (Query String or Request Body)');
            return;
          }

          logger.rewrite.debug('[Save] Mode: Request Rewrite');
          logger.rewrite.debug('[Save] Query String:', queryString);
          logger.rewrite.debug('[Save] Request Body:', requestBody);
        } else {
          // Response tab active - rewrite response only
          if (!textarea.value.trim()) {
            alert('Enter response data');
            return;
          }

          responseData = JSON.parse(textarea.value);

          logger.rewrite.debug('[Save] Mode: Response Rewrite');
          logger.rewrite.debug('[Save] Response Data:', responseData);
        }

        onSave(urlWithoutQuery, item.method, statusCode, responseData, queryString, requestBody);

        // Success message (toast style)
        const successMsg = document.createElement('div');
        successMsg.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${tokens.color.bg.surface};
        color: ${tokens.color.text.secondary};
        border: 1px solid ${tokens.color.border.subtle};
        padding: 12px 20px;
        border-radius: ${tokens.radius.sm};
        font-size: 14px;
        font-weight: 500;
        z-index: ${tokens.zIndex.toast};
        box-shadow: ${tokens.shadow.md};
        max-width: 90%;
        font-family: ${tokens.font.system};
      `;
        const modeText = isRequestTabActive
          ? 'Request rewrite enabled'
          : 'Response rewrite enabled';
        successMsg.textContent = modeText;
        document.body.appendChild(successMsg);

        setTimeout(() => {
          document.body.removeChild(successMsg);
          // Close modal
          const overlay = document.querySelector(
            '.remote-debug-network-rewrite-modal',
          )?.parentElement;
          if (overlay) {
            overlay.remove();
          }
          // Reload page to apply rewrite
          globalThis.location.reload();
        }, 1500);
      } catch {
        alert('Invalid JSON format.');
      }
    });
  }, 0);

  return { content: container, buttons: buttonsContainer };
}
