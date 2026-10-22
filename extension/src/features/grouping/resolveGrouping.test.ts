import { describe, expect, it } from "vitest";
import { resolveGrouping } from "./resolveGrouping";

const tabs = [
  { id: 1, title: "React docs" },
  { id: 2, title: "TypeScript docs" },
];

const fallback = [{ name: "Development", ids: [1, 2] }];

describe("resolveGrouping", () => {
  it("uses valid AI suggestions", () => {
    const ai = [{ name: "Web development", ids: [1, 2] }];
    expect(resolveGrouping(tabs, ai, fallback)).toEqual(ai);
  });

  it("uses fallback for invalid AI suggestions", () => {
    expect(
      resolveGrouping(tabs, [{ name: "Incomplete", ids: [1] }], fallback),
    ).toEqual(fallback);
  });

  it("uses fallback when AI is unavailable", () => {
    expect(resolveGrouping(tabs, null, fallback)).toEqual(fallback);
  });

  it("keeps all tabs when both grouping results are invalid", () => {
    const result = resolveGrouping(tabs, null, []);
    expect(result.flatMap((group) => group.ids).sort()).toEqual([1, 2]);
  });
});
