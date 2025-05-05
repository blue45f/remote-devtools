"use client";

import axios from "axios";
import Script from "next/script";
import { useEffect, useState } from "react";

type WebviewPageProps = {
  useScriptSdk?: boolean;
};

export const WebviewPage = ({ useScriptSdk = false }: WebviewPageProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [node, setNode] = useState<string[]>([]);
  // API 요청을 보내는 함수 (Fetch)
  const handleApiRequest = () => {
    const url = "https://jsonplaceholder.typicode.com/todos/1?dd=1";
    fetch(url)
      .then((response) => {
        console.log("response.ok:", response.ok);
        return response.json();
      })
      .then((data) => {
        console.log("Fetch Response:", data);
      })
      .catch((error) => {
        console.error("Fetch 요청 중 오류 발생:", error);
      });
  };

  // API 요청을 보내는 함수 (XMLHttpRequest - axios 시뮬레이션)
  const handleXhrRequest = () => {
    const url = "https://jsonplaceholder.typicode.com/todos/2";
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        console.log("XHR Response:", data);
      }
    };
    xhr.onerror = function () {
      console.error("XHR 요청 중 오류 발생");
    };
    xhr.send();
  };

  // axios 직접 사용
  const handleAxiosRequest = async () => {
    const url = "https://jsonplaceholder.typicode.com/todos/3";

    try {
      console.log("Axios request starting...");
      const response = await axios.request({
        method: "GET",
        url,
      });
      console.log("Axios Response:", response.data);
      console.log("Status:", response.status);
    } catch (error) {
      console.error("Axios 요청 실패:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Error status:", error.response.status);
        console.error("Error data:", error.response.data);
      }
    }
  };

  // POST 요청 (새 리소스 생성)
  const handlePostRequest = async () => {
    const url = "https://jsonplaceholder.typicode.com/posts";
    const data = {
      title: "테스트 게시글",
      body: "이것은 테스트 게시글의 본문입니다.",
      userId: 1,
    };

    try {
      console.log("POST 요청 시작:", data);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      console.log("POST 응답:", result);
      console.log("Status:", response.status);
    } catch (error) {
      console.error("POST 요청 실패:", error);
    }
  };

  // PUT 요청 (리소스 업데이트)
  const handlePutRequest = async () => {
    const url = "https://jsonplaceholder.typicode.com/posts/1";
    const data = {
      id: 1,
      title: "수정된 게시글",
      body: "이것은 수정된 게시글의 본문입니다.",
      userId: 1,
    };

    try {
      console.log("PUT 요청 시작:", data);
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      console.log("PUT 응답:", result);
      console.log("Status:", response.status);
    } catch (error) {
      console.error("PUT 요청 실패:", error);
    }
  };

  // PATCH 요청 (부분 업데이트)
  const handlePatchRequest = async () => {
    const url = "https://jsonplaceholder.typicode.com/posts/1";
    const data = {
      title: "부분 수정된 제목",
    };

    try {
      console.log("PATCH 요청 시작:", data);
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      console.log("PATCH 응답:", result);
      console.log("Status:", response.status);
    } catch (error) {
      console.error("PATCH 요청 실패:", error);
    }
  };

  // DELETE 요청 (리소스 삭제)
  const handleDeleteRequest = async () => {
    const url = "https://jsonplaceholder.typicode.com/posts/1";

    try {
      console.log("DELETE 요청 시작");
      const response = await fetch(url, {
        method: "DELETE",
      });
      console.log("DELETE 응답 Status:", response.status);
      if (response.ok) {
        console.log("리소스가 성공적으로 삭제되었습니다");
      }
    } catch (error) {
      console.error("DELETE 요청 실패:", error);
    }
  };

  const handleClickDomChange = () => {
    if (node.length >= 19) return;
    setNode([...node, getKoreanCharacterByConsonant(node.length)]);
  };

  const handleClickConsoleLog = () => {
    console.log("console click", { a: { b: { c: { d: 1 } } } });
    console.error("console error", new Error("error test"));
    console.warn("warn");
    throw new Error("error throw");
  };

  const handleDeepLink = () => {
    // 네이티브 앱 연동 시 커스텀 딥링크 스킴 사용
    // 예: window.location.href = 'app://showToast?message=테스트'
    alert("딥링크 테스트 (네이티브 앱 연동 시 커스텀 스킴 사용)");
  };

  useEffect(() => {
    // SDK를 스크립트 방식으로 불러오는 경우
    if (useScriptSdk) {
      if (window.RemoteDebugSdk) {
        window.RemoteDebugSdk.createDebugger();
      }
    } else {
      // SDK를 import하여 사용하는 경우
      import("remote-debug-sdk").then(({ createDebugger }) => {
        createDebugger();
      });
    }
  }, [useScriptSdk]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isLoading]);

  return (
    <>
      {useScriptSdk && (
        <Script
          src={`${"http://localhost:3001"}/sdk/index.umd.js`}
          strategy="beforeInteractive"
          onLoad={() => {
            console.log("SDK 로드 완료");
          }}
        />
      )}
      <div style={styles.container}>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <>
            <h1 style={styles.title}>웹뷰 예시 페이지</h1>

            <div>
              <img
                height={100}
                src="https://dummyimage.com/300x200/000/fff.png"
              />
            </div>

            <button
              style={styles.button}
              type="button"
              onClick={() => setIsLoading(true)}
            >
              Loading
            </button>

            {/* GET 요청 버튼들 */}
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "16px", marginBottom: "10px" }}>
                GET 요청
              </h3>
              <button
                style={styles.button}
                type="button"
                onClick={handleApiRequest}
              >
                GET (Fetch)
              </button>
              <button
                style={{ ...styles.button, backgroundColor: "#28a745" }}
                type="button"
                onClick={handleXhrRequest}
              >
                GET (XHR)
              </button>
              <button
                style={{ ...styles.button, backgroundColor: "#8b5cf6" }}
                type="button"
                onClick={handleAxiosRequest}
              >
                GET (axios)
              </button>
            </div>

            {/* 다른 HTTP 메서드 버튼들 */}
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "16px", marginBottom: "10px" }}>
                Body 포함 요청
              </h3>
              <button
                style={{ ...styles.button, backgroundColor: "#007bff" }}
                type="button"
                onClick={handlePostRequest}
              >
                POST 요청
              </button>
              <button
                style={{
                  ...styles.button,
                  backgroundColor: "#ffc107",
                  color: "#000",
                }}
                type="button"
                onClick={handlePutRequest}
              >
                PUT 요청
              </button>
              <button
                style={{ ...styles.button, backgroundColor: "#17a2b8" }}
                type="button"
                onClick={handlePatchRequest}
              >
                PATCH 요청
              </button>
              <button
                style={{ ...styles.button, backgroundColor: "#dc3545" }}
                type="button"
                onClick={handleDeleteRequest}
              >
                DELETE 요청
              </button>
            </div>
            {/* DOM 변경 버튼 */}
            <button
              style={styles.button}
              type="button"
              onClick={handleClickDomChange}
            >
              DOM 변경
            </button>
            {/* console 버튼 */}
            <button
              style={styles.button}
              type="button"
              onClick={handleClickConsoleLog}
            >
              console 기록
            </button>
            {/* 딥링크 테스트 버튼 */}
            <button
              style={{ ...styles.button, backgroundColor: "#ff6b35" }}
              type="button"
              onClick={handleDeepLink}
            >
              딥링크 테스트 (location.href)
            </button>
            <div style={styles.charNode}>
              {node.map((char, index) => (
                <span key={index}>{char}</span>
              ))}
            </div>
            <div style={styles.scrollArea}>스크롤을 위한 영역 1</div>
            <div style={styles.scrollArea}>스크롤을 위한 영역 2</div>
            <div style={styles.scrollArea}>스크롤을 위한 영역 3</div>
            <div style={styles.scrollArea}>스크롤을 위한 영역 4</div>
            <div style={styles.scrollArea}>스크롤을 위한 영역 5</div>
            <div style={styles.scrollArea}>스크롤을 위한 영역 6</div>
            {/* CTA 영역 높이만큼 여백 추가 */}
            <div style={{ height: "200px" }} />

            {/* 하단 고정 CTA 영역 */}
            <div style={styles.ctaWrapper}>
              <div style={styles.ctaContainer}>
                <div style={styles.deliveryBadge}>🛵 배달 혜택 받는 중</div>

                <div style={styles.priceInfo}>
                  <div style={styles.totalPrice}>
                    <span style={styles.priceLabel}>총 주문금액</span>
                    <span style={styles.priceValue}>12,000원</span>
                  </div>
                  <div style={styles.minOrderInfo}>
                    8,000원 더 담으면 주문 가능
                  </div>
                </div>

                <div style={styles.orderButtonWrapper}>
                  <button
                    style={styles.orderButton}
                    onClick={() => alert("주문하기 클릭!")}
                  >
                    <span style={styles.deliveryType}>가게배달</span>
                    <span style={styles.orderButtonText}>
                      12,000원 주문하기
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    overflow: "scroll",
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "20px",
    color: "black",
  },
  button: {
    padding: "10px 20px",
    fontSize: "18px",
    color: "white",
    backgroundColor: "#007BFF",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    marginBottom: "10px",
  },
  charNode: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px",
    color: "black",
  },
  scrollArea: {
    height: "400px",
    widows: "400px",
    backgroundColor: "tan",
    marginBottom: "10px",
  },
  // CTA 영역 스타일
  ctaWrapper: {
    position: "fixed" as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.1)",
    zIndex: 1000,
    padding: "12px 16px 20px",
    borderTopLeftRadius: "12px",
    borderTopRightRadius: "12px",
  },
  ctaContainer: {
    maxWidth: "600px",
    margin: "0 auto",
  },
  deliveryBadge: {
    display: "inline-block",
    backgroundColor: "#e8f9ff",
    color: "#2ac1bc",
    padding: "4px 12px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "bold",
    marginBottom: "12px",
  },
  priceInfo: {
    marginBottom: "12px",
  },
  totalPrice: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  priceLabel: {
    fontSize: "14px",
    color: "#666",
  },
  priceValue: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#000",
  },
  minOrderInfo: {
    fontSize: "13px",
    color: "#2ac1bc",
    marginTop: "4px",
  },
  orderButtonWrapper: {
    marginTop: "12px",
  },
  orderButton: {
    width: "100%",
    padding: "16px",
    backgroundColor: "#2ac1bc",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    transition: "background-color 0.2s",
  },
  deliveryType: {
    fontSize: "14px",
    opacity: 0.9,
  },
  orderButtonText: {
    fontSize: "16px",
  },
};

function getKoreanCharacterByConsonant(offset: number) {
  // "가"의 유니코드 값
  const baseCode = 0xac00;
  // 한글의 자음 간 유니코드 차이
  const consonantInterval = 588;
  // offset에 맞는 자음 글자 반환
  const resultChar = String.fromCharCode(baseCode + consonantInterval * offset);
  return resultChar;
}
