import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters out falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("merges conflicting tailwind classes (later wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm text-fg-subtle", "text-fg")).toBe("text-sm text-fg");
  });

  it("supports conditional objects", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });

  it("flattens arrays", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });
});
