/**
 * Playwright를 사용한 HTML to Image 렌더링
 * 실제 브라우저 엔진으로 정확한 렌더링
 */

import { chromium } from "playwright";

/**
 * HTML을 실제 브라우저로 렌더링하여 이미지로 변환
 */
export async function renderHTMLToImage(
  head: string,
  body: string,
  width: number,
  height: number,
  bodyClass?: string,
  baseHref?: string,
  fullPage: boolean = false, // 전체 페이지 캡처 옵션 추가
): Promise<string> {
  let browser = null;
  let context = null;
  let page = null;

  try {
    // Headless 브라우저 실행
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox", // Docker 환경을 위한 옵션
        "--disable-web-security", // CORS 및 보안 제한 해제
        "--ignore-certificate-errors", // SSL 인증서 오류 무시
        "--lang=ko-KR", // 언어 설정
        "--accept-lang=ko-KR,ko",
      ],
    });

    context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      ignoreHTTPSErrors: true, // SSL 인증서 오류 무시
      locale: "ko-KR", // 한국어 로케일 설정
    });

    page = await context.newPage();

    // Docker 환경에서 localhost를 host.docker.internal로 변경
    const processedHead = head.replace(
      /http:\/\/localhost:/g,
      "http://host.docker.internal:",
    );
    const processedBody = body.replace(
      /http:\/\/localhost:/g,
      "http://host.docker.internal:",
    );

    // HTML 문서 구성
    const baseTag = baseHref ? `<base href="${baseHref}">` : "";

    const html = `
      <!DOCTYPE html>
      <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${baseTag}
          ${processedHead}
          <style>
            /* 범용 웹폰트 로드 - 한글 지원을 위한 최소한의 폴백 */
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              /* 원본 페이지의 폰트를 최대한 유지, 한글 폴백만 추가 */
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', 'Malgun Gothic', sans-serif;
              -webkit-font-smoothing: antialiased;
              text-rendering: optimizeLegibility;
            }
            
            /* 한글 렌더링 최적화 */
            * {
              word-break: keep-all;
              line-height: 1.5;
            }
            
            /* 원본 스타일을 덮어쓰지 않도록 낮은 우선순위 */
            body:not([style*="font-family"]) {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', 'Malgun Gothic', sans-serif;
            }
          </style>
        </head>
        <body${bodyClass ? ` class="${bodyClass}"` : ""}>
          ${processedBody}
        </body>
      </html>
    `;

    // HTML 설정 및 렌더링 대기
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    // JavaScript 실행을 위한 대기
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // 웹폰트 로드 대기
    await page.evaluate(() => {
      if ("fonts" in document) {
        return document.fonts.ready;
      }
      return Promise.resolve();
    });

    // 추가 폰트 로드 시간
    await page.waitForTimeout(1500);

    // JavaScript가 DOM을 수정할 시간을 주기
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 추가로 이미지 로드 확인 및 대기
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images).map((img) => {
          if (img.complete) {
            return Promise.resolve();
          }
          return new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve());
            img.addEventListener("error", () => {
              console.warn("이미지 로드 실패:", img.src);
              resolve(); // 에러가 나도 계속 진행
            });
            // 5초 타임아웃
            setTimeout(() => {
              console.warn("이미지 로드 타임아웃:", img.src);
              resolve();
            }, 5000);
          });
        }),
      );
    });

    // 렌더링이 완료되도록 잠시 대기
    await new Promise((resolve) => setTimeout(resolve, 500));

    // fullPage 모드에서 fixed/sticky 요소 처리
    if (fullPage) {
      console.log("[Render] Fixed/Sticky 포지션 요소 처리 중...");

      await page.evaluate(() => {
        // 모든 요소 검사
        const allElements = document.querySelectorAll("*");
        const fixedElements: HTMLElement[] = [];
        const stickyElements: HTMLElement[] = [];

        allElements.forEach((element) => {
          const style = window.getComputedStyle(element);
          const htmlElement = element as HTMLElement;

          // inline style과 computed style 모두 체크
          const isFixed =
            style.position === "fixed" ||
            (htmlElement.style && htmlElement.style.position === "fixed");

          if (isFixed) {
            fixedElements.push(htmlElement);
            // 디버깅을 위한 상세 로그
            console.warn(`[Fixed Handler] Fixed element found:`, {
              tagName: element.tagName,
              className: element.className,
              id: element.id,
              bottom: style.bottom,
              top: style.top,
              zIndex: style.zIndex,
              inlineStyle: htmlElement.style?.cssText,
              innerHTML: element.innerHTML?.substring(0, 100),
            });
          } else if (style.position === "sticky") {
            stickyElements.push(htmlElement);
          }
        });

        console.log(
          `[Fixed Handler] Found ${fixedElements.length} fixed elements`,
        );
        console.log(
          `[Fixed Handler] Found ${stickyElements.length} sticky elements`,
        );

        // fixed 요소들을 처리
        fixedElements.forEach((element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          const bottom = style.bottom;
          const top = style.top;

          // bottom이 설정되어 있고 작은 값이면 (하단 고정 CTA로 판단)
          // 또는 zIndex가 높은 경우도 CTA로 간주 (999 이상)
          const isBottomFixed =
            bottom && bottom !== "auto" && parseInt(bottom) < 150;
          const hasHighZIndex = style.zIndex && parseInt(style.zIndex) >= 999;
          const textContent = element.textContent || "";
          const isCTAContent =
            textContent.includes("주문") ||
            textContent.includes("배달") ||
            textContent.includes("장바구니") ||
            textContent.includes("결제") ||
            textContent.includes("원");

          // CTA로 판단하는 조건들
          const shouldConvert =
            isBottomFixed ||
            (bottom === "0px" && hasHighZIndex) ||
            (bottom === "0px" && isCTAContent);

          if (shouldConvert) {
            console.warn(
              "[Fixed Handler] Converting bottom-fixed element to absolute",
            );
            console.warn("[Fixed Handler] Element info:", {
              className: element.className,
              bottom: bottom,
              zIndex: style.zIndex,
              isBottomFixed: isBottomFixed,
              hasHighZIndex: hasHighZIndex,
              isCTAContent: isCTAContent,
              textPreview: textContent.substring(0, 50),
            });

            // 페이지 전체 높이 계산
            const pageHeight = Math.max(
              document.body.scrollHeight,
              document.body.offsetHeight,
              document.documentElement.clientHeight,
              document.documentElement.scrollHeight,
              document.documentElement.offsetHeight,
            );

            // fixed를 absolute로 변경
            element.style.position = "absolute";

            // 요소의 높이 가져오기
            const elementHeight = rect.height;

            // 페이지 하단에서 원래 bottom 값만큼 띄워서 배치
            element.style.top = `${pageHeight - elementHeight - parseInt(bottom)}px`;
            element.style.bottom = "auto";

            // width가 100%나 viewport 기준인 경우 처리
            if (
              style.width === "100%" ||
              style.width === "100vw" ||
              rect.width >= window.innerWidth - 10
            ) {
              element.style.width = "100%";
              element.style.left = "0";
              element.style.right = "0";
            }

            // body에 relative 포지션 설정 (absolute의 기준점)
            if (document.body.style.position === "") {
              document.body.style.position = "relative";
              document.body.style.minHeight = `${pageHeight}px`;
            }

            // 필요시 z-index 유지
            if (style.zIndex) {
              element.style.zIndex = style.zIndex;
            }
          }
          // top이 설정되어 있고 작은 값이면 (상단 고정 헤더로 판단)
          else if (top && top !== "auto" && parseInt(top) < 150) {
            console.log(
              "[Fixed Handler] Keeping top-fixed element as-is (header)",
            );
            // 헤더는 그대로 두거나 필요시 absolute로 변경
            // element.style.position = 'absolute'
          }
        });

        // sticky 요소들도 처리
        stickyElements.forEach((element) => {
          // sticky 요소를 relative로 변경 (스크롤 시 고정되지 않도록)
          console.log("[Fixed Handler] Converting sticky element to relative");
          element.style.position = "relative";
        });
      });

      // 변경 사항 적용 대기
      await page.waitForTimeout(300);
    }

    // 디버깅: H1 태그의 실제 계산된 스타일 확인
    const h1Style = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      if (h1) {
        const computed = window.getComputedStyle(h1);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          fontSize: computed.fontSize,
          parentBg: h1.parentElement
            ? window.getComputedStyle(h1.parentElement).backgroundColor
            : "none",
        };
      }
      return null;
    });

    if (h1Style) {
      console.log("[Render] H1 계산된 스타일:", JSON.stringify(h1Style));
    }

    // 페이지의 전체 배경색 확인
    const bodyStyle = await page.evaluate(() => {
      const body = document.body;
      const computed = window.getComputedStyle(body);
      return {
        backgroundColor: computed.backgroundColor,
        className: body.className,
      };
    });

    console.log("[Render] Body 스타일:", JSON.stringify(bodyStyle));

    // 전체 페이지 캡처 모드일 때 실제 컨텐츠 크기 가져오기
    const screenshotOptions: any = {
      type: "png",
    };

    if (fullPage) {
      console.log("[Render] 전체 페이지 캡처 모드");

      // 전체 컨텐츠 크기 가져오기
      const dimensions = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          clientWidth: document.documentElement.clientWidth,
          clientHeight: document.documentElement.clientHeight,
        };
      });

      console.log("[Render] 전체 페이지 크기:", dimensions);

      // Figma 제한을 고려한 크기 제한 (전체 페이지 캡처를 위해 높이는 더 크게)
      const MAX_HEIGHT = 15000; // 15000px까지 허용 (압축으로 파일 크기 조절)
      const MAX_WIDTH = 4000; // 4000px로 제한

      const targetWidth = Math.min(dimensions.scrollWidth, MAX_WIDTH);
      const targetHeight = Math.min(dimensions.scrollHeight, MAX_HEIGHT);

      if (
        dimensions.scrollHeight > MAX_HEIGHT ||
        dimensions.scrollWidth > MAX_WIDTH
      ) {
        console.log(
          `[Render] 페이지 크기 제한 적용: ${targetWidth}x${targetHeight} (원본: ${dimensions.scrollWidth}x${dimensions.scrollHeight})`,
        );
        screenshotOptions.fullPage = false;
        screenshotOptions.clip = {
          x: 0,
          y: 0,
          width: targetWidth,
          height: targetHeight,
        };
      } else {
        // fullPage 옵션 사용
        screenshotOptions.fullPage = true;
      }
    } else {
      // 기존 방식: viewport 크기만큼만 캡처
      screenshotOptions.fullPage = false;
      screenshotOptions.clip = {
        x: 0,
        y: 0,
        width,
        height,
      };
    }

    // 스크린샷 캡처
    console.log("[Render] 스크린샷 캡처 중...");
    const screenshot = await page.screenshot(screenshotOptions);

    // 스크린샷 크기 확인
    const sizeInMB = screenshot.length / (1024 * 1024);
    console.log(`[Render] 스크린샷 크기: ${sizeInMB.toFixed(2)} MB`);

    // 크기에 따라 적극적인 압축 적용 (3MB부터 압축 시작)
    if (sizeInMB > 3) {
      console.log("[Render] 이미지가 크므로 JPEG로 압축합니다");

      // 크기에 따라 품질 조정
      let quality = 90;
      if (sizeInMB > 20) {
        quality = 50; // 초대형 이미지는 50% 품질
      } else if (sizeInMB > 15) {
        quality = 60; // 매우 큰 이미지는 60% 품질
      } else if (sizeInMB > 10) {
        quality = 70; // 큰 이미지는 70% 품질
      } else if (sizeInMB > 7) {
        quality = 75; // 중간 크기는 75% 품질
      } else if (sizeInMB > 5) {
        quality = 80; // 작은 큰 이미지는 80% 품질
      }

      console.log(`[Render] JPEG 품질: ${quality}%`);
      screenshotOptions.type = "jpeg";
      screenshotOptions.quality = quality;

      const compressedScreenshot = await page.screenshot(screenshotOptions);
      const compressedSizeInMB = compressedScreenshot.length / (1024 * 1024);
      console.log(`[Render] 압축 후 크기: ${compressedSizeInMB.toFixed(2)} MB`);

      // 그래도 너무 크면 더 낮은 품질로 재시도
      if (compressedSizeInMB > 10 && quality > 50) {
        console.log(`[Render] 여전히 크므로 품질을 50%로 재압축`);
        screenshotOptions.quality = 50;
        const recompressedScreenshot = await page.screenshot(screenshotOptions);
        const recompressedSizeInMB =
          recompressedScreenshot.length / (1024 * 1024);
        console.log(
          `[Render] 재압축 후 크기: ${recompressedSizeInMB.toFixed(2)} MB`,
        );

        const base64 = recompressedScreenshot.toString("base64");
        return `data:image/jpeg;base64,${base64}`;
      }

      const base64 = compressedScreenshot.toString("base64");
      return `data:image/jpeg;base64,${base64}`;
    }

    // Base64로 변환
    const base64 = screenshot.toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error("HTML 렌더링 실패:", error);
    throw new Error(`HTML을 이미지로 변환할 수 없습니다: ${error.message}`);
  } finally {
    // 리소스 정리
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}
