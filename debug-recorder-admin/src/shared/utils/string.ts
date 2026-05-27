/**
 * 문자열에서 모든 공백을 제거합니다.
 */
export function removeSpaces(value: string): string {
  return value.replace(/\s/g, '')
}

/**
 * 프로젝트 키를 정규화합니다.
 * - 대문자로 변환
 * - 영문자가 아닌 문자 제거
 */
export function sanitizeIssueProjectKey(value: string): string {
  return value.toUpperCase().replace(/[^A-Z]/g, '')
}

export const sanitizeJiraProjectKey = sanitizeIssueProjectKey

/**
 * 문자열을 camelCase로 변환합니다.
 */
export function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
}

/**
 * 문자열을 kebab-case로 변환합니다.
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

/**
 * 문자열을 지정된 길이로 자르고 말줄임표를 추가합니다.
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}
