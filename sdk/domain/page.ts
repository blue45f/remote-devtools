/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { BaseDomain } from "./base";

export class Page extends BaseDomain {
  public static MAINFRAME_ID = 1;

  public namespace = "Page";

  private frame = new Map();

  private intervalTimer: NodeJS.Timeout | null = null;

  public enable() {
    const xhr = new XMLHttpRequest();
    xhr.$$requestType = "Document";
    xhr.onload = () => {
      this.frame.set(location.href, xhr.responseText);
    };
    xhr.onerror = () => {
      this.frame.set(location.href, "Cannot get script source code");
    };

    xhr.open("GET", location.href);
    xhr.send();
  }

  public getResourceTree() {
    return {
      frameTree: {
        frame: {
          id: 1,
          mimeType: "text/html",
          securityOrigin: location.origin,
          url: location.href,
        },
        resources: [],
      },
    };
  }

  /**
   * Get html content
   */
  public getResourceContent({ url }: { url: string }) {
    return {
      content: this.frame.get(url),
    };
  }
}
