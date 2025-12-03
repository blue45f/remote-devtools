import * as UI from '../../ui/legacy/legacy.js';

let loadedSessionReplayModule;

async function loadSessionReplayModule() {
    if (!loadedSessionReplayModule) {
        loadedSessionReplayModule = await import('./session_replay.js');
    }
    return loadedSessionReplayModule;
}

// DevTools 패널로 등록
UI.ViewManager.registerViewExtension({
    location: 'panel', // 패널 위치
    id: 'sessionReplay',
    commandPrompt: () => 'Session Replay',
    title: () => 'Session Replay',
    order: 10000, // ScreenPreview 다음에 표시
    async loadView() {
        const SessionReplay = await loadSessionReplayModule();
        return SessionReplay.SessionReplayPanel.instance();
    },
});
