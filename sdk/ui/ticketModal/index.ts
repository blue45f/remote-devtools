import { CommonInfo } from "../../types/common";

import { createTicketModal } from "./components/modal";
import { TicketFormData } from "./types";

/**
 * 티켓 모달 생성 및 표시
 *
 * @param commonInfo - 사용자 정보
 * @returns 폼 데이터 또는 null
 */
export async function openTicketModal(
  commonInfo: CommonInfo,
): Promise<TicketFormData | null> {
  return new Promise((resolve) => {
    createTicketModal(
      (_commonInfo: CommonInfo | null, formData?: TicketFormData) => {
        // 여기서는 실제로 티켓을 생성하지 않고 데이터만 반환
        if (formData) {
          resolve(formData);
        }
      },
      () => resolve(null),
      commonInfo,
    );
  });
}

// 타입 재수출
export type { TicketFormData } from "./types";

// 기존 호환성을 위해 createTicketModal도 export
export { createTicketModal } from "./components/modal";
