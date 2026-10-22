export interface GroupingTab {
  id: number;
  title: string;
}

export interface SuggestedGroup {
  name: string;
  ids: number[];
}

export function validateGrouping(
  tabs: GroupingTab[],
  groups: SuggestedGroup[],
): boolean {
  if (!Array.isArray(tabs) || !Array.isArray(groups) || groups.length === 0) {
    return false;
  }

  const expectedIds = new Set(tabs.map((tab) => tab.id));
  const seenIds = new Set<number>();

  for (const group of groups) {
    if (
      typeof group.name !== "string" ||
      !group.name.trim() ||
      !Array.isArray(group.ids) ||
      group.ids.length === 0
    ) {
      return false;
    }

    for (const id of group.ids) {
      if (
        typeof id !== "number" ||
        !expectedIds.has(id) ||
        seenIds.has(id)
      ) {
        return false;
      }

      seenIds.add(id);
    }
  }

  return seenIds.size === expectedIds.size;
}
