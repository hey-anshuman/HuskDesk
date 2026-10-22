import type { GroupingTab, SuggestedGroup } from "./validateGrouping";
import { validateGrouping } from "./validateGrouping";

export function resolveGrouping(
  tabs: GroupingTab[],
  suggestedGroups: SuggestedGroup[] | null,
  fallbackGroups: SuggestedGroup[],
): SuggestedGroup[] {
  if (suggestedGroups && validateGrouping(tabs, suggestedGroups)) {
    return suggestedGroups;
  }

  if (validateGrouping(tabs, fallbackGroups)) {
    return fallbackGroups;
  }

  // Safe final fallback: keep every tab and its identity.
return tabs.map((tab) => ({
  name: tab.title.trim() || "Untitled",
  ids: [tab.id],
}));
}
