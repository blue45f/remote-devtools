/**
 * HTML-to-image rendering using Playwright.
 * Launches a real browser engine for accurate rendering.
 */

import { Logger } from "@nestjs/common";
import type { Page } from "playwright";
import { chromium } from "playwright";

const logger = new Logger("HtmlToImageRenderer");

/** Maximum dimensions for full-page capture. */
const MAX_CAPTURE_HEIGHT = 15000;
const MAX_CAPTURE_WIDTH = 4000;

/** Threshold (in MB) above which JPEG compression is applied. */
const COMPRESSION_THRESHOLD_MB = 3;

/** Size (in MB) that triggers a second compression pass. */
const RECOMPRESSION_THRESHOLD_MB = 10;

/**
 * Determines the JPEG quality level based on image size in megabytes.
 */
function resolveJpegQuality(sizeInMB: number): number {
  if (sizeInMB > 20) return 50;
  if (sizeInMB > 15) return 60;
  if (sizeInMB > 10) return 70;
  if (sizeInMB > 7) return 75;
  if (sizeInMB > 5) return 80;
  return 90;
}

/**
 * Waits for all images on the page to load (or time out after 5 s each).
 */
async function waitForAllImages(page: Page): Promise<void> {
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve());
          img.addEventListener("error", () => resolve());
          setTimeout(() => resolve(), 5000);
        });
      }),
    );
  });
}

/**
 * Converts fixed/sticky-positioned elements to absolute positioning
 * so they render correctly in a full-page screenshot.
 */
async function convertFixedElementsToAbsolute(page: Page): Promise<void> {
  logger.log("Processing fixed/sticky position elements for full-page capture");

  await page.evaluate(() => {
    const allElements = document.querySelectorAll("*");
    const fixedElements: HTMLElement[] = [];
    const stickyElements: HTMLElement[] = [];

    allElements.forEach((element) => {
      const style = window.getComputedStyle(element);
      const htmlElement = element as HTMLElement;

      const isFixed =
        style.position === "fixed" ||
        (htmlElement.style && htmlElement.style.position === "fixed");

      if (isFixed) {
        fixedElements.push(htmlElement);
      } else if (style.position === "sticky") {
        stickyElements.push(htmlElement);
      }
    });

    // Convert bottom-fixed elements (e.g. CTA buttons) to absolute
    fixedElements.forEach((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const bottom = style.bottom;

      const isBottomFixed =
        bottom && bottom !== "auto" && parseInt(bottom) < 150;
      const hasHighZIndex = style.zIndex && parseInt(style.zIndex) >= 999;
      const textContent = element.textContent || "";
      const isCTAContent =
        textContent.includes("\uc8fc\ubb38") ||
        textContent.includes("\ubc30\ub2ec") ||
        textContent.includes("\uc7a5\ubc14\uad6c\ub2c8") ||
        textContent.includes("\uacb0\uc81c") ||
        textContent.includes("\uc6d0");

      const shouldConvert =
        isBottomFixed ||
        (bottom === "0px" && hasHighZIndex) ||
        (bottom === "0px" && isCTAContent);

      if (shouldConvert) {
        const pageHeight = Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight,
        );

        element.style.position = "absolute";
        const elementHeight = rect.height;
        element.style.top = `${pageHeight - elementHeight - parseInt(bottom)}px`;
        element.style.bottom = "auto";

        if (
          style.width === "100%" ||
          style.width === "100vw" ||
          rect.width >= window.innerWidth - 10
        ) {
          element.style.width = "100%";
          element.style.left = "0";
          element.style.right = "0";
        }

        if (document.body.style.position === "") {
          document.body.style.position = "relative";
          document.body.style.minHeight = `${pageHeight}px`;
        }

        if (style.zIndex) {
          element.style.zIndex = style.zIndex;
        }
      }
    });

    // Convert sticky elements to relative
    stickyElements.forEach((element) => {
      element.style.position = "relative";
    });
  });

  await page.waitForTimeout(300);
}

/**
 * Renders the given HTML (head + body) in a headless browser and returns
 * a base64-encoded data URI of the resulting screenshot.
 *
 * @param head    - HTML to inject into `<head>` (stylesheets, scripts, etc.)
 * @param body    - HTML to inject into `<body>`
 * @param width   - Viewport width in pixels
 * @param height  - Viewport height in pixels
 * @param bodyClass - Optional CSS class to apply to `<body>`
 * @param baseHref  - Optional `<base href>` value
 * @param fullPage  - When true, captures the entire scrollable page
 */
export async function renderHTMLToImage(
  head: string,
  body: string,
  width: number,
  height: number,
  bodyClass?: string,
  baseHref?: string,
  fullPage: boolean = false,
): Promise<string> {
  let browser = null;
  let context = null;
  let page: Page | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        "--ignore-certificate-errors",
        "--lang=ko-KR",
        "--accept-lang=ko-KR,ko",
      ],
    });

    context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      ignoreHTTPSErrors: true,
      locale: "ko-KR",
    });

    page = await context.newPage();

    // Replace localhost with host.docker.internal for Docker environments
    const processedHead = head.replace(
      /http:\/\/localhost:/g,
      "http://host.docker.internal:",
    );
    const processedBody = body.replace(
      /http:\/\/localhost:/g,
      "http://host.docker.internal:",
    );

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
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap');

            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', 'Malgun Gothic', sans-serif;
              -webkit-font-smoothing: antialiased;
              text-rendering: optimizeLegibility;
            }

            * {
              word-break: keep-all;
              line-height: 1.5;
            }

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

    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // Wait for web fonts to load
    await page.evaluate(async () => {
      if ("fonts" in document) {
        await document.fonts.ready;
      }
    });

    // Additional time for font rendering
    await page.waitForTimeout(1500);

    // Allow JavaScript to modify the DOM
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await waitForAllImages(page);

    // Brief pause for final rendering
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (fullPage) {
      await convertFixedElementsToAbsolute(page);
    }

    const screenshotOptions: Record<string, unknown> = { type: "png" };

    if (fullPage) {
      logger.log("Full-page capture mode enabled");

      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        clientWidth: document.documentElement.clientWidth,
        clientHeight: document.documentElement.clientHeight,
      }));

      logger.log(`Full-page dimensions: ${JSON.stringify(dimensions)}`);

      const targetWidth = Math.min(dimensions.scrollWidth, MAX_CAPTURE_WIDTH);
      const targetHeight = Math.min(
        dimensions.scrollHeight,
        MAX_CAPTURE_HEIGHT,
      );

      if (
        dimensions.scrollHeight > MAX_CAPTURE_HEIGHT ||
        dimensions.scrollWidth > MAX_CAPTURE_WIDTH
      ) {
        logger.log(
          `Applying size limits: ${targetWidth}x${targetHeight} (original: ${dimensions.scrollWidth}x${dimensions.scrollHeight})`,
        );
        screenshotOptions.fullPage = false;
        screenshotOptions.clip = {
          x: 0,
          y: 0,
          width: targetWidth,
          height: targetHeight,
        };
      } else {
        screenshotOptions.fullPage = true;
      }
    } else {
      screenshotOptions.fullPage = false;
      screenshotOptions.clip = { x: 0, y: 0, width, height };
    }

    logger.log("Capturing screenshot...");
    const screenshot = await page.screenshot(screenshotOptions);

    const sizeInMB = screenshot.length / (1024 * 1024);
    logger.log(`Screenshot size: ${sizeInMB.toFixed(2)} MB`);

    // Apply JPEG compression for large images
    if (sizeInMB > COMPRESSION_THRESHOLD_MB) {
      const quality = resolveJpegQuality(sizeInMB);
      logger.log(`Image is large; compressing to JPEG at quality ${quality}%`);

      screenshotOptions.type = "jpeg";
      screenshotOptions.quality = quality;

      const compressedScreenshot = await page.screenshot(screenshotOptions);
      const compressedSizeInMB = compressedScreenshot.length / (1024 * 1024);
      logger.log(`Compressed size: ${compressedSizeInMB.toFixed(2)} MB`);

      // Re-compress at lower quality if still too large
      if (compressedSizeInMB > RECOMPRESSION_THRESHOLD_MB && quality > 50) {
        logger.log("Still too large; re-compressing at 50% quality");
        screenshotOptions.quality = 50;
        const recompressedScreenshot = await page.screenshot(screenshotOptions);
        const recompressedSizeInMB =
          recompressedScreenshot.length / (1024 * 1024);
        logger.log(`Re-compressed size: ${recompressedSizeInMB.toFixed(2)} MB`);

        const base64 = recompressedScreenshot.toString("base64");
        return `data:image/jpeg;base64,${base64}`;
      }

      const base64 = compressedScreenshot.toString("base64");
      return `data:image/jpeg;base64,${base64}`;
    }

    const base64 = screenshot.toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown rendering error";
    logger.error(`HTML rendering failed: ${message}`);
    throw new Error(`Failed to convert HTML to image: ${message}`);
  } finally {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}
