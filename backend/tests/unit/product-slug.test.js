import { describe, expect, it } from "vitest";

import {
  createSlugBase,
  createSlugCandidate,
  normalizeSearchText,
} from "../../src/utils/product-slug.js";

describe("product slug utilities", () => {
  it("normalizes Vietnamese text for search", () => {
    expect(normalizeSearchText("  Giày Đế Mềm  ")).toBe("giay de mem");
  });

  it("creates a stable ASCII slug base", () => {
    expect(createSlugBase("SẢI Court Pro 2.0")).toBe("sai-court-pro-2-0");
    expect(createSlugBase("👟")).toBe("san-pham");
  });

  it("adds a suffix after the first candidate", () => {
    expect(createSlugCandidate("sai-run", 1)).toBe("sai-run");
    expect(createSlugCandidate("sai-run", 3)).toBe("sai-run-3");
  });
});
