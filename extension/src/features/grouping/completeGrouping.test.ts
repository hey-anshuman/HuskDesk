import { describe, expect, it } from "vitest";
import {
    REVIEW_GROUP_NAME,
    completeAiGroups,
    mergeGroupsByName,
} from "./completeGrouping";

const tabs = [
    { id: 0, title: "React docs" },
    { id: 1, title: "TypeScript handbook" },
    { id: 2, title: "Hackathon signup" },
    { id: 3, title: "Hacktoberfest" },
];

describe("completeAiGroups", () => {
    it("accepts a complete grouping unchanged", () => {
        const groups = [
            { name: "Development", ids: [0, 1] },
            { name: "Events", ids: [2, 3] },
        ];
        expect(completeAiGroups(tabs, groups)).toEqual(groups);
    });

    it("drops unknown and duplicate IDs instead of rejecting everything", () => {
        const result = completeAiGroups(tabs, [
            { name: "Development", ids: [0, 1, 99] },
            { name: "Events", ids: [1, 2, 3] },
        ]);
        expect(result).toEqual([
            { name: "Development", ids: [0, 1] },
            { name: "Events", ids: [2, 3] },
        ]);
    });

    it("merges groups with the same name, ignoring case and spacing", () => {
        const result = completeAiGroups(tabs, [
            { name: "Development", ids: [0] },
            { name: "  development ", ids: [1] },
            { name: "Events", ids: [2, 3] },
        ]);
        expect(result).toEqual([
            { name: "Development", ids: [0, 1] },
            { name: "Events", ids: [2, 3] },
        ]);
    });

    it("puts omitted tabs in a trailing Other / Review group", () => {
        const result = completeAiGroups(tabs, [
            { name: "Development", ids: [0, 1] },
            { name: "Events", ids: [2] },
        ]);
        expect(result).toEqual([
            { name: "Development", ids: [0, 1] },
            { name: "Events", ids: [2] },
            { name: REVIEW_GROUP_NAME, ids: [3] },
        ]);
    });

    it("adds omitted tabs to a review group the model already created", () => {
        const result = completeAiGroups(tabs, [
            { name: "other / review", ids: [3] },
            { name: "Development", ids: [0, 1] },
            { name: "Events", ids: [2] },
        ]);
        expect(result?.map((group) => group.name)).toEqual([
            "Development",
            "Events",
            "other / review",
        ]);
    });

    it("returns null when too few tabs land in real groups", () => {
        expect(
            completeAiGroups(tabs, [{ name: "Development", ids: [0] }]),
        ).toBeNull();
    });

    it("returns null when the model put everything in review", () => {
        expect(
            completeAiGroups(tabs, [{ name: REVIEW_GROUP_NAME, ids: [0, 1, 2, 3] }]),
        ).toBeNull();
    });

    it("returns null for malformed or empty output", () => {
        expect(completeAiGroups(tabs, [])).toBeNull();
        expect(completeAiGroups(tabs, [null, "x", { name: 5, ids: [0] }])).toBeNull();
        expect(completeAiGroups([], [{ name: "A", ids: [0] }])).toBeNull();
    });
});

describe("mergeGroupsByName", () => {
    it("does not mutate its input", () => {
        const input = [
            { name: "A", ids: [1] },
            { name: "a", ids: [2] },
        ];
        mergeGroupsByName(input);
        expect(input).toEqual([
            { name: "A", ids: [1] },
            { name: "a", ids: [2] },
        ]);
    });
});
