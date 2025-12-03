# RRWeb 라이브러리 파일들

이 디렉토리에는 rrweb 관련 라이브러리 파일들이 저장됩니다.

## 필요한 파일들

다음 파일들을 다운로드하여 이 디렉토리에 저장해주세요:

### 1. rrweb 라이브러리

- **파일명**: `rrweb.min.js`
- **다운로드 URL**: `https://cdn.jsdelivr.net/npm/rrweb@2.0.0-alpha.11/dist/rrweb.min.js`
- **용도**: DOM 캡처 및 직렬화

### 2. rrweb-player 라이브러리

- **파일명**: `rrweb-player.min.js`
- **다운로드 URL**: `https://cdn.jsdelivr.net/npm/rrweb-player@2.0.0-alpha.11/dist/index.js`
- **용도**: 세션 재생

### 3. rrweb-player CSS

- **파일명**: `rrweb-player.css`
- **다운로드 URL**: `https://cdn.jsdelivr.net/npm/rrweb-player@2.0.0-alpha.11/dist/style.css`
- **용도**: 플레이어 스타일링

## 자동 다운로드

`download-rrweb-files.sh` 스크립트를 실행하여 자동으로 파일들을 다운로드할 수 있습니다:

```bash
chmod +x download-rrweb-files.sh
./download-rrweb-files.sh
```

## 파일 구조

```
third_party/rrweb/
├── README.md
├── download-rrweb-files.sh
├── rrweb.min.js
├── rrweb-player.min.js
└── rrweb-player.css
```
