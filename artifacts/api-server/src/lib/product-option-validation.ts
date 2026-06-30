export type SerializedProductOption = {
  id: number;
  name: string;
  priceAdjustment: number;
  available: boolean;
  sortOrder: number;
};

export type SerializedProductOptionGroup = {
  id: number;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  sortOrder: number;
  options: SerializedProductOption[];
};

export type OrderOptionSnapshot = {
  optionId: number;
  groupName: string;
  optionName: string;
  priceAdjustment: number;
};

export function validateOrderItemSelections(
  product: { id: number; name: string; price: string },
  groups: SerializedProductOptionGroup[],
  quantity: number,
  selectedOptionIds: number[] | undefined,
): {
  ok: true;
  unitPrice: number;
  productName: string;
  subtotal: number;
  options: OrderOptionSnapshot[];
} | { ok: false; error: string } {
  const ids = selectedOptionIds ?? [];
  const optionById = new Map<number, { group: SerializedProductOptionGroup; option: SerializedProductOption }>();

  for (const group of groups) {
    for (const option of group.options) {
      optionById.set(option.id, { group, option });
    }
  }

  for (const id of ids) {
    if (!optionById.has(id)) {
      return { ok: false, error: `Invalid option ${id} for product ${product.name}` };
    }
  }

  const selectionsByGroup = new Map<number, number[]>();
  for (const id of ids) {
    const entry = optionById.get(id)!;
    const list = selectionsByGroup.get(entry.group.id) ?? [];
    list.push(id);
    selectionsByGroup.set(entry.group.id, list);
  }

  for (const group of groups) {
    const selected = selectionsByGroup.get(group.id) ?? [];
    const availableSelected = selected.filter((id) => {
      const opt = optionById.get(id)!.option;
      return opt.available;
    });

    if (group.required && availableSelected.length === 0) {
      return { ok: false, error: `Please select an option for ${group.name}` };
    }
    if (availableSelected.length < group.minSelections) {
      return {
        ok: false,
        error: `Select at least ${group.minSelections} option(s) for ${group.name}`,
      };
    }
    if (availableSelected.length > group.maxSelections) {
      return {
        ok: false,
        error: `Select at most ${group.maxSelections} option(s) for ${group.name}`,
      };
    }
  }

  if (groups.length === 0 && ids.length > 0) {
    return { ok: false, error: `Product ${product.name} does not support options` };
  }

  const snapshots: OrderOptionSnapshot[] = [];
  let adjustmentTotal = 0;
  const optionLabels: string[] = [];

  for (const id of ids) {
    const { group, option } = optionById.get(id)!;
    if (!option.available) {
      return { ok: false, error: `${option.name} is not available` };
    }
    snapshots.push({
      optionId: id,
      groupName: group.name,
      optionName: option.name,
      priceAdjustment: option.priceAdjustment,
    });
    adjustmentTotal += option.priceAdjustment;
    optionLabels.push(option.name);
  }

  const basePrice = parseFloat(product.price);
  const unitPrice = basePrice + adjustmentTotal;
  const productName =
    optionLabels.length > 0 ? `${product.name} (${optionLabels.join(", ")})` : product.name;

  return {
    ok: true,
    unitPrice,
    productName,
    subtotal: unitPrice * quantity,
    options: snapshots,
  };
}

export function buildCartLineKey(productId: number, selectedOptionIds: number[]): string {
  if (selectedOptionIds.length === 0) return String(productId);
  return `${productId}:${[...selectedOptionIds].sort((a, b) => a - b).join("-")}`;
}
