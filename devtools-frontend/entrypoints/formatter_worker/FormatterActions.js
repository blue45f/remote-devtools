// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export const FORMATTABLE_MEDIA_TYPES = [
    "application/javascript" /* FormattableMediaTypes.APPLICATION_JAVASCRIPT */,
    "application/json" /* FormattableMediaTypes.APPLICATION_JSON */,
    "application/manifest+json" /* FormattableMediaTypes.APPLICATION_MANIFEST_JSON */,
    "text/css" /* FormattableMediaTypes.TEXT_CSS */,
    "text/html" /* FormattableMediaTypes.TEXT_HTML */,
    "text/javascript" /* FormattableMediaTypes.TEXT_JAVASCRIPT */,
    "text/x-scss" /* FormattableMediaTypes.TEXT_X_SCSS */,
    // JSON 관련 추가 MIME 타입들
    "application/vnd.api+json" /* JSON API */,
    "application/ld+json" /* JSON-LD */,
    "application/hal+json" /* HAL JSON */,
    "application/schema+json" /* JSON Schema */,
    "application/feed+json" /* JSON Feed */,
    "application/x-json" /* Legacy JSON */,
    "text/json" /* Alternative JSON */,
    "text/x-json" /* Alternative JSON */,
    // XML 관련 MIME 타입들
    "application/xml" /* XML */,
    "text/xml" /* Text XML */,
    "application/xhtml+xml" /* XHTML */,
];
/**
 * MIME 타입이 포맷 가능한지 확인하는 헬퍼 함수
 * @param {string} mimeType - 확인할 MIME 타입
 * @returns {boolean} 포맷 가능 여부
 */
export function isFormattableMediaType(mimeType) {
    if (!mimeType) {
        return false;
    }
    
    // 기본 배열에 포함되어 있는지 확인
    if (FORMATTABLE_MEDIA_TYPES.includes(mimeType)) {
        return true;
    }
    
    // application/*+json 패턴 매칭 (JSON 변형 타입 모두 지원)
    if (/^application\/[\w.-]+\+json$/i.test(mimeType)) {
        return true;
    }
    
    // text/plain으로 잘못 설정된 JSON 응답 처리 (내용 기반 판단 필요)
    // 이 경우는 실제 내용을 보고 판단해야 하므로 별도 처리 필요
    
    return false;
}
//# sourceMappingURL=FormatterActions.js.map