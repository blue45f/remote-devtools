import { readSdkEnv } from '../../utils/env';

import { SimpleColumnData } from './types';

/**
 * API 호스트 주소 가져오기
 */
export function getAPIHost(): string {
  return readSdkEnv('VITE_INTERNAL_HOST', 'http://localhost:3000');
}

/**
 * 모든 컴포넌트 옵션을 수집하는 헬퍼 함수
 */
export function collectAllComponentOptions(columns: SimpleColumnData[]): Map<string, string[]> {
  const componentCategories = new Map<string, string[]>();

  columns.forEach((column) => {
    // 헤더에 '컴포넌트'가 포함된 모든 컬럼에서 옵션 수집
    if (column.header.includes('컴포넌트')) {
      // 컬럼 헤더를 카테고리로 사용 (예: "단계 컴포넌트", "도메인 컴포넌트")
      const category = column.header;

      if (!componentCategories.has(category)) {
        componentCategories.set(category, []);
      }

      const categoryOptions = componentCategories.get(category);
      if (categoryOptions) {
        column.values.forEach((value) => {
          if (value.text.trim()) {
            categoryOptions.push(value.text.trim());
          }
        });
      }
    }
  });

  return componentCategories;
}
