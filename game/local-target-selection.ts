export type LocalTargetSelectionFacts = {
  selectionActive: boolean;
  selectedTargetIds: readonly string[];
  minTargetCount: number;
  maxTargetCount: number;
  canConfirm: boolean;
  hasLocalInput: boolean;
  instruction?: string;
};

export type LocalTargetSelectionView = {
  selectionActive: boolean;
  selectedTargetIds: readonly string[];
  minTargetCount: number;
  maxTargetCount: number;
  canConfirm: boolean;
  canCancel: boolean;
  instruction: string;
};

function targetWord(count: number) {
  return count === 1 ? "target" : "targets";
}

export function buildLocalTargetSelectionView(facts: LocalTargetSelectionFacts): LocalTargetSelectionView {
  const minTargetCount = Math.max(0, facts.minTargetCount);
  const maxTargetCount = Math.max(minTargetCount, facts.maxTargetCount);
  const selectedTargetIds = facts.selectedTargetIds;
  const count = selectedTargetIds.length;
  const range = minTargetCount === maxTargetCount
    ? `${minTargetCount} ${targetWord(minTargetCount)}`
    : `${minTargetCount}–${maxTargetCount} targets`;
  const instruction = facts.instruction ?? `Select ${range} · ${count} selected`;
  return {
    selectionActive: facts.selectionActive,
    selectedTargetIds,
    minTargetCount,
    maxTargetCount,
    canConfirm: facts.selectionActive && facts.canConfirm,
    canCancel: facts.selectionActive && facts.hasLocalInput,
    instruction,
  };
}
