import { describe, expect, it } from "vitest";
import { validateGrouping } from "./validateGrouping";

const tabs = [
  { id: 1, title: "React docs" },
  { id: 2, title: "TypeScript handbook" },
  { id: 3, title: "CSS Grid guide" },
];

describe("validateGrouping", () => {
  it("accepts groups containing every tab exactly once", () => {
    expect(
      validateGrouping(tabs, [
        { name: "Development", ids: [1, 2] },
        { name: "CSS", ids: [3] },
      ]),
    ).toBe(true);
  });

  it("rejects missing tab IDs", () => {
    expect(
      validateGrouping(tabs, [{ name: "Development", ids: [1, 2] }]),
    ).toBe(false);
  });

  it("rejects duplicate IDs", () => {
    expect(
      validateGrouping(tabs, [
        { name: "First", ids: [1, 2] },
        { name: "Second", ids: [2, 3] },
      ]),
    ).toBe(false);
  });

  it("rejects unknown IDs", () => {
    expect(
      validateGrouping(tabs, [{ name: "Development", ids: [1, 2, 99] }]),
    ).toBe(false);
  });

  it("rejects empty groups and blank names", () => {
    expect(validateGrouping(tabs, [])).toBe(false);
    expect(
      validateGrouping(tabs, [
        { name: "   ", ids: [1, 2, 3] },
      ]),
    ).toBe(false);
  });
});
