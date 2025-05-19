#!/bin/bash

# RRWeb 라이브러리 파일들 다운로드 스크립트
# 이 스크립트는 rrweb 관련 파일들을 자동으로 다운로드합니다.

set -e

echo "🚀 RRWeb 라이브러리 파일들을 다운로드합니다..."

# 현재 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 다운로드할 파일들 정의
declare -A FILES=(
    ["rrweb.min.js"]="https://cdn.jsdelivr.net/npm/rrweb@2.0.0-alpha.11/dist/rrweb.min.js"
    ["rrweb-player.min.js"]="https://cdn.jsdelivr.net/npm/rrweb-player@2.0.0-alpha.11/dist/index.js"
    ["rrweb-player.css"]="https://cdn.jsdelivr.net/npm/rrweb-player@2.0.0-alpha.11/dist/style.css"
)

# 각 파일 다운로드
for filename in "${!FILES[@]}"; do
    url="${FILES[$filename]}"
    echo "📥 다운로드 중: $filename"
    
    if curl -s -L -o "$filename" "$url"; then
        echo "✅ 성공: $filename"
    else
        echo "❌ 실패: $filename"
        exit 1
    fi
done

echo ""
echo "🎉 모든 파일이 성공적으로 다운로드되었습니다!"
echo ""
echo "다운로드된 파일들:"
ls -la *.js *.css 2>/dev/null || echo "파일이 없습니다."

echo ""
echo "이제 session_replay.js에서 로컬 파일을 참조할 수 있습니다."
