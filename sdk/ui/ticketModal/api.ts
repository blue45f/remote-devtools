import { createFormFields } from "./components/fields";
import {
  createTemplateSelector,
  reloadFormWithTemplate,
} from "./components/templateSelector";
import { applyButtonStyles } from "./styles";
import {
  ApiResponse,
  LoadFormDataParams,
  SimpleStructuredSheetData,
  TicketFormData,
  TicketFormDataResponse,
  UserTemplatesResponse,
} from "./types";
import { getAPIHost } from "./utils";

/**
 * 사용자 템플릿 목록 조회 (API 함수)
 */
export async function getUserTemplates(
  deviceId: string,
): Promise<UserTemplatesResponse | null> {
  try {
    const apiHost = getAPIHost();
    const apiUrl = `${apiHost}/api/user-templates?deviceId=${encodeURIComponent(deviceId)}`;

    const fetchResponse = await fetch(apiUrl);

    // VPN 체크: 403 에러 확인
    if (fetchResponse.status === 403) {
      console.error("[RemoteDebug-SDK][VPN Error] VPN 연결이 필요합니다.");
      return null;
    }

    const response: ApiResponse<UserTemplatesResponse> =
      await fetchResponse.json();

    if (response.success && response.data) {
      return response.data;
    } else {
      console.error(
        "[RemoteDebug-SDK][API Error] 템플릿 목록 조회 실패:",
        response,
      );
      return null;
    }
  } catch (error) {
    // 네트워크 에러 (ERR_ADDRESS_UNREACHABLE, ERR_CONNECTION_REFUSED 등)
    // Internal 서버 접근 실패는 VPN 미연결로 간주
    console.error(
      "[RemoteDebug-SDK][VPN Error] 네트워크 연결 실패 (VPN 필요):",
      error,
    );
    return null;
  }
}

/**
 * 특정 템플릿 기준으로 폼 데이터 조회 (API 함수)
 */
export async function getTicketFormDataByTemplate(
  deviceId: string,
  templateName: string,
): Promise<SimpleStructuredSheetData | null> {
  try {
    const apiHost = getAPIHost();
    const apiUrl = `${apiHost}/api/ticket-form-data-by-template?deviceId=${encodeURIComponent(deviceId)}&templateName=${encodeURIComponent(templateName)}`;

    const fetchResponse = await fetch(apiUrl);

    // VPN 체크: 403 에러 확인
    if (fetchResponse.status === 403) {
      console.error("[RemoteDebug-SDK][VPN Error] VPN 연결이 필요합니다.");
      return null;
    }

    const response: ApiResponse<SimpleStructuredSheetData> =
      await fetchResponse.json();

    if (response.success && response.data) {
      return response.data;
    } else {
      console.error(
        "[RemoteDebug-SDK][API Error] 특정 템플릿 폼 데이터 조회 실패:",
        response,
      );
      return null;
    }
  } catch (error) {
    // 네트워크 에러 (ERR_ADDRESS_UNREACHABLE, ERR_CONNECTION_REFUSED 등)
    console.error(
      "[RemoteDebug-SDK][VPN Error] 네트워크 연결 실패 (VPN 필요):",
      error,
    );
    return null;
  }
}

/**
 * 템플릿 선택 업데이트 (API 함수)
 */
export async function selectTemplate(
  deviceId: string,
  templateName: string,
): Promise<boolean> {
  try {
    const apiHost = getAPIHost();
    const apiUrl = `${apiHost}/api/select-template`;

    const fetchResponse = await fetch(apiUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, templateName }),
    });

    // VPN 체크: 403 에러 확인
    if (fetchResponse.status === 403) {
      console.error("[RemoteDebug-SDK][VPN Error] VPN 연결이 필요합니다.");
      return false;
    }

    const response: ApiResponse<{ message: string }> =
      await fetchResponse.json();

    if (response.success) {
      return true;
    } else {
      console.error(
        "[RemoteDebug-SDK][API Error] 템플릿 선택 업데이트 실패:",
        response,
      );
      return false;
    }
  } catch (error) {
    // 네트워크 에러 (ERR_ADDRESS_UNREACHABLE, ERR_CONNECTION_REFUSED 등)
    console.error(
      "[RemoteDebug-SDK][VPN Error] 네트워크 연결 실패 (VPN 필요):",
      error,
    );
    return false;
  }
}

/**
 * REST API를 통해 어드민 DB 데이터를 가져와서 동적으로 폼을 생성
 */
export async function loadTicketFormDataFromAPI({
  commonInfo,
  form,
  loadingDiv,
  cancelButton,
  submitButton,
  createTicketDirect,
}: LoadFormDataParams) {
  const deviceId =
    commonInfo?.device?.deviceId || "OPUD85CE1A76-1EE7-49DB-BE5C-81C3C72C3EF1";

  try {
    if (!deviceId) {
      throw new Error("Device ID is missing.");
    }

    // 1. 사용자 템플릿 목록 조회 및 선택 UI 생성
    const userTemplates = await getUserTemplates(deviceId);

    // 템플릿 조회 실패 시 조기 리턴 (VPN 체크 포함)
    if (!userTemplates) {
      // VPN 에러인지 확인하기 위해 다시 시도
      const apiHost = getAPIHost();
      const testUrl = `${apiHost}/api/user-templates?deviceId=${encodeURIComponent(deviceId)}`;
      try {
        const testResponse = await fetch(testUrl);
        if (testResponse.status === 403) {
          // 403 에러 - VPN 필요
          loadingDiv.innerHTML =
            '<div style="text-align: center; line-height: 1.6;">' +
            '<div style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">VPN Connection Required</div>' +
            '<div style="color: #a1a1aa; margin-bottom: 8px;">Ticket creation is unavailable.</div>' +
            '<div style="color: #a1a1aa;">Check your server connection and try again.</div>' +
            "</div>";
          submitButton.style.display = "none";
          cancelButton.textContent = "OK";
          return;
        }
      } catch (e) {
        // 네트워크 에러 (ERR_ADDRESS_UNREACHABLE 등) - VPN 필요
        console.error("[RemoteDebug-SDK][VPN Error] 네트워크 연결 실패:", e);
        loadingDiv.innerHTML =
          '<div style="text-align: center; line-height: 1.6;">' +
          '<div style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">VPN Connection Required</div>' +
          '<div style="color: #a1a1aa; margin-bottom: 8px;">Ticket creation requires a corporate VPN connection.</div>' +
          '<div style="color: #a1a1aa;">Connect to VPN and try again.</div>' +
          "</div>";
        submitButton.style.display = "none";
        cancelButton.textContent = "OK";
        return;
      }

      loadingDiv.innerHTML =
        "Could not load ticket template data.<br/>" +
        "Check your server connection.";

      submitButton.style.display = "none";
      cancelButton.textContent = "OK";
      return;
    }

    // 템플릿이 비어있는 경우 조기 리턴
    if (userTemplates.ticketTemplateList.length === 0) {
      console.error("[RemoteDebug-SDK][Template Error] 등록된 템플릿이 없음");
      loadingDiv.innerHTML =
        "No templates registered.<br/>" +
        "Register a template in the admin panel first.";

      submitButton.style.display = "none";
      cancelButton.textContent = "OK";
      return;
    }

    if (
      userTemplates &&
      userTemplates.ticketTemplateList.length > 1 &&
      form.parentElement
    ) {
      // 여러 템플릿이 있으면 선택 UI 생성
      createTemplateSelector(
        form.parentElement,
        userTemplates.ticketTemplateList,
        userTemplates.lastSelectedTemplate,
        async (templateName: string) => {
          // 해당 템플릿 기준으로 폼 다시 로드 (select-template API 호출 제거)
          await reloadFormWithTemplate(
            deviceId,
            templateName,
            form,
            loadingDiv,
            getTicketFormDataByTemplate,
            createFormFields,
          );
        },
      );
    } else {
      console.log(
        "[RemoteDebug-SDK][Template Debug] 템플릿이 1개뿐이거나 없음, 선택 UI 생성 안함",
      );
    }

    // 2. REST API 호출 (어드민 DB 기반으로 엔드포인트 변경)
    const apiHost = getAPIHost();
    const apiUrl = `${apiHost}/api/ticket-form-data?deviceId=${encodeURIComponent(deviceId)}`;

    let fetchResponse: Response;
    try {
      fetchResponse = await fetch(apiUrl);
    } catch (networkError) {
      // 네트워크 에러 (ERR_ADDRESS_UNREACHABLE 등) - VPN 필요
      console.error(
        "[RemoteDebug-SDK][VPN Error] 네트워크 연결 실패:",
        networkError,
      );
      loadingDiv.innerHTML =
        '<div style="text-align: center; line-height: 1.6;">' +
        '<div style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">VPN Connection Required</div>' +
        '<div style="color: #a1a1aa; margin-bottom: 8px;">Ticket creation requires a corporate VPN connection.</div>' +
        '<div style="color: #a1a1aa;">Connect to VPN and try again.</div>' +
        "</div>";
      submitButton.style.display = "none";
      cancelButton.textContent = "OK";
      return;
    }

    // VPN 체크: 403 에러 확인
    if (fetchResponse.status === 403) {
      loadingDiv.innerHTML =
        '<div style="text-align: center; line-height: 1.6;">' +
        '<div style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">VPN Connection Required</div>' +
        '<div style="color: #a1a1aa; margin-bottom: 8px;">Ticket creation requires a corporate VPN connection.</div>' +
        '<div style="color: #a1a1aa;">Connect to VPN and try again.</div>' +
        "</div>";
      submitButton.style.display = "none";
      cancelButton.textContent = "OK";
      return;
    }

    const response: TicketFormDataResponse = await fetchResponse.json();

    if (!response.success) {
      const errorData = response;

      console.error(
        "[RemoteDebug-SDK][API Response Error] 티켓 폼 데이터 조회 실패:",
        JSON.stringify(
          {
            url: apiUrl,
            response: errorData,
            errorCode: errorData.errorCode,
            message: errorData.message,
          },
          null,
          2,
        ),
      );

      // 사용자 정보가 없는 경우
      if (errorData.errorCode === "NO_USER_INFO") {
        loadingDiv.innerHTML =
          "User registration is required.<br/>" +
          "Contact your admin to request registration.";
        submitButton.style.display = "none";
        cancelButton.textContent = "OK";
        return;
      }

      // TC 스프레드시트가 없는 경우
      if (errorData.errorCode === "NO_TC_SPREADSHEET") {
        loadingDiv.innerHTML =
          "No test case sheet linked to this device.<br>" +
          "기본 티켓을 생성하거나, 관리자 페이지에서 TC 링크를 추가해주세요.";

        // 기본 티켓 생성 버튼을 buttonContainer에 추가
        const defaultTicketButton = document.createElement("button");
        defaultTicketButton.textContent = "Create Basic Ticket";
        applyButtonStyles(defaultTicketButton, "primary");

        defaultTicketButton.addEventListener("click", () => {
          // 모달 닫기 - 새로운 구조에 맞게 수정
          const scrollableContent = form.parentElement;
          const modalElement = scrollableContent?.parentElement;
          const overlayElement = modalElement?.parentElement;
          if (overlayElement) {
            document.body.removeChild(overlayElement);
          }
          createTicketDirect(commonInfo);
        });

        // 기존 버튼들 제거하고 새로 배치: 취소 - 기본 티켓 생성 순서
        const modalElement = form.parentElement
          ?.parentElement as HTMLDivElement;
        const modalButtonContainer =
          modalElement?.querySelector("div:last-child");
        if (modalButtonContainer) {
          modalButtonContainer.innerHTML = "";

          // 취소 버튼 (원래 cancelButton)
          cancelButton.textContent = "Cancel";
          applyButtonStyles(cancelButton, "secondary");

          modalButtonContainer.appendChild(cancelButton);
          modalButtonContainer.appendChild(defaultTicketButton);
        }

        submitButton.style.display = "none";
        return;
      }

      throw new Error(errorData.message || "API response error");
    }

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to retrieve data");
    }

    const sheetData: SimpleStructuredSheetData = response.data;

    // 폼 필드 생성
    createFormFields(form, sheetData);

    // 폼 필드 생성 완료

    // Submit 버튼 클릭 시 폼 데이터 수집 및 제출
    submitButton.addEventListener("click", () => {
      const formData: TicketFormData = {};
      const formElements = form.elements;

      // 모든 폼 필드에서 데이터 수집 (input과 select 모두 처리)
      for (let i = 0; i < formElements.length; i++) {
        const element = formElements[i] as HTMLInputElement | HTMLSelectElement;

        if (element.name && element.value) {
          // 통합된 컴포넌트 필드 처리
          if (element.name === "components") {
            // hidden input에서 쉼표로 구분된 값을 배열로 변환
            const componentValues = element.value
              .split(",")
              .filter((v) => v.trim());
            if (componentValues.length > 0) {
              formData.components = componentValues;
            }
          }
          // 라벨/레이블 필드도 컴포넌트와 같은 방식으로 처리
          else if (element.name === "labels") {
            // hidden input에서 쉼표로 구분된 값을 배열로 변환
            const labelValues = element.value
              .split(",")
              .filter((v) => v.trim());
            if (labelValues.length > 0) {
              formData.labels = labelValues;
            }
          } else {
            formData[element.name] = element.value;
          }
        }
      }

      // 모달 닫기 - 새로운 구조에 맞게 수정
      const scrollableContent = form.parentElement;
      const modalElement = scrollableContent?.parentElement;
      const overlayElement = modalElement?.parentElement;
      if (overlayElement) {
        document.body.removeChild(overlayElement);
      }
      createTicketDirect(commonInfo, formData);
    });

    // 로딩 숨기고 폼 표시
    loadingDiv.style.display = "none";
    form.style.display = "flex";

    // 첫 번째 입력 필드에 포커스 (input 또는 select)
    const firstInput = form.querySelector("input, select");
    if (firstInput) {
      setTimeout(
        () => (firstInput as HTMLInputElement | HTMLSelectElement).focus(),
        100,
      );
    }
  } catch (error) {
    console.error(
      "[RemoteDebug-SDK][API Error] TC 새로고침 실패:",
      JSON.stringify(
        {
          error:
            error instanceof Error
              ? {
                  message: error.message,
                  stack: error.stack,
                  name: error.name,
                }
              : error,
          deviceId: deviceId,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
    );

    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    loadingDiv.innerHTML = `Error: ${errorMessage}`;
    loadingDiv.style.color = "#f87171";
    submitButton.style.display = "none";
    cancelButton.textContent = "OK";
  }
}
