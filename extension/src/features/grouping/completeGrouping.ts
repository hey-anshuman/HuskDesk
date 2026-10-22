import type { GroupingTab, SuggestedGroup } from "./validateGrouping";
import { validateGrouping } from "./validateGrouping";

export const REVIEW_GROUP_NAME = "Other / Review";

/**
 * Minimum share of tabs the model must place into real (non-review) groups.
 * Below this the AI output is not meaningfully better than a domain grouping.
 */
export const MIN_AI_COVERAGE = 0.5;

function nameKey(name: string): string {
    return name.trim().replace(/\s+/g, " ").toLowerCase();
}

const REVIEW_KEY = nameKey(REVIEW_GROUP_NAME);

/** Merge groups that share a (case/whitespace-insensitive) name. Review group goes last. */
export function mergeGroupsByName(groups: SuggestedGroup[]): SuggestedGroup[] {
    const byName = new Map<string, SuggestedGroup>();

    for (const group of groups) {
        const key = nameKey(group.name);
        const existing = byName.get(key);

        if (existing) {
            existing.ids.push(...group.ids);
        } else {
            byName.set(key, { name: group.name.trim(), ids: [...group.ids] });
        }
    }

    const merged = Array.from(byName.entries());
    const regular = merged.filter(([key]) => key !== REVIEW_KEY).map(([, g]) => g);
    const review = merged.filter(([key]) => key === REVIEW_KEY).map(([, g]) => g);

    return [...regular, ...review];
}

/**
 * Turn raw model output into a complete, valid grouping for `tabs`, or null.
 *
 * - Unknown IDs, duplicate IDs and malformed groups are dropped (not fatal).
 * - Groups with the same name are merged.
 * - Tabs the model omitted go to "Other / Review" (never guessed by domain).
 * - If too few tabs landed in real groups, returns null so the caller falls back.
 */
export function completeAiGroups(
    tabs: GroupingTab[],
    rawGroups: unknown[],
): SuggestedGroup[] | null {
    if (tabs.length === 0) return null;

    const validIds = new Set(tabs.map((tab) => tab.id));
    const seen = new Set<number>();
    const cleaned: SuggestedGroup[] = [];

    for (const raw of rawGroups) {
        if (!raw || typeof raw !== "object") continue;

        const { name, ids } = raw as { name?: unknown; ids?: unknown };
        if (typeof name !== "string" || !name.trim() || !Array.isArray(ids)) continue;

        const kept: number[] = [];
        for (const id of ids) {
            if (typeof id === "number" && validIds.has(id) && !seen.has(id)) {
                seen.add(id);
                kept.push(id);
            }
        }

        if (kept.length > 0) cleaned.push({ name: name.trim(), ids: kept });
    }

    const merged = mergeGroupsByName(cleaned);

    const groupedCount = merged
        .filter((group) => nameKey(group.name) !== REVIEW_KEY)
        .reduce((sum, group) => sum + group.ids.length, 0);

    if (groupedCount / tabs.length < MIN_AI_COVERAGE) return null;

    const missingIds = tabs.filter((tab) => !seen.has(tab.id)).map((tab) => tab.id);

    if (missingIds.length > 0) {
        const review = merged.find((group) => nameKey(group.name) === REVIEW_KEY);
        if (review) review.ids.push(...missingIds);
        else merged.push({ name: REVIEW_GROUP_NAME, ids: missingIds });
    }

    return validateGrouping(tabs, merged) ? merged : null;
}
