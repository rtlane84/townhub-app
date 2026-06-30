/** Format a choice price adjustment for display (+$1.00, -$0.50, or empty for zero). */
export function formatOptionPriceAdjustment(amount: number): string | null {
  if (amount === 0) return null;
  const sign = amount > 0 ? "+" : "-";
  return `${sign}$${Math.abs(amount).toFixed(2)}`;
}

export function selectionTypeLabel(selectionType: "SINGLE" | "MULTIPLE"): string {
  return selectionType === "SINGLE" ? "Single Choice" : "Multiple Choice";
}

export function selectionTypeDetail(selectionType: "SINGLE" | "MULTIPLE"): string {
  return selectionType === "SINGLE" ? "Single Choice (Radio)" : "Multiple Choice (Checkbox)";
}
