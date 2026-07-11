import {
  db,
  modifierGroupsTable,
  modifierChoicesTable,
  productModifierGroupsTable,
  type ModifierGroup,
  type ModifierChoice,
} from "@workspace/db";
import { eq, inArray, asc, and } from "drizzle-orm";
import {
  type SerializedProductOption,
  type SerializedProductOptionGroup,
  validateOrderItemSelections,
  buildCartLineKey,
} from "./product-option-validation";

export type {
  SerializedProductOption,
  SerializedProductOptionGroup,
  OrderOptionSnapshot,
} from "./product-option-validation";

export { validateOrderItemSelections, buildCartLineKey };

export type ModifierChoiceInput = {
  name: string;
  priceAdjustment?: number;
  active?: boolean;
  sortOrder?: number;
};

export type ModifierGroupInput = {
  name: string;
  description?: string;
  selectionType?: "SINGLE" | "MULTIPLE";
  required?: boolean;
  maxSelections?: number;
  active?: boolean;
  sortOrder?: number;
  choices: ModifierChoiceInput[];
};

export type AssignedModifierGroupSummary = {
  id: number;
  name: string;
  active: boolean;
  sortOrder: number;
};

export type SerializedModifierChoice = {
  id: number;
  name: string;
  priceAdjustment: number;
  active: boolean;
  sortOrder: number;
};

export type SerializedModifierGroup = {
  id: number;
  businessId: number;
  name: string;
  description: string | null;
  selectionType: "SINGLE" | "MULTIPLE";
  required: boolean;
  maxSelections: number | null;
  active: boolean;
  sortOrder: number;
  choices: SerializedModifierChoice[];
};

function serializeChoice(c: ModifierChoice): SerializedModifierChoice {
  return {
    id: c.id,
    name: c.name,
    priceAdjustment: parseFloat(c.priceAdjustment),
    active: c.active,
    sortOrder: c.sortOrder,
  };
}

function resolveMinMaxSelections(group: ModifierGroup, activeChoiceCount: number) {
  const minSelections = group.required ? 1 : 0;
  const maxSelections =
    group.selectionType === "SINGLE"
      ? 1
      : Math.max(group.maxSelections ?? activeChoiceCount, minSelections);
  return { minSelections, maxSelections };
}

export function modifierGroupToOptionGroup(
  group: ModifierGroup,
  choices: ModifierChoice[],
  assignmentSortOrder: number,
  activeOnly: boolean,
): SerializedProductOptionGroup | null {
  const groupChoices = choices.filter((c) => c.modifierGroupId === group.id);
  const filteredChoices = (activeOnly ? groupChoices.filter((c) => c.active) : groupChoices)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

  if (activeOnly && !group.active) return null;
  if (activeOnly && filteredChoices.length === 0) return null;

  const { minSelections, maxSelections } = resolveMinMaxSelections(group, filteredChoices.length);

  return {
    id: group.id,
    name: group.name,
    required: group.required,
    minSelections,
    maxSelections,
    sortOrder: assignmentSortOrder,
    options: filteredChoices.map((c) => ({
      id: c.id,
      name: c.name,
      priceAdjustment: parseFloat(c.priceAdjustment),
      available: c.active,
      sortOrder: c.sortOrder,
    })),
  };
}

function serializeModifierGroup(
  group: ModifierGroup,
  choices: ModifierChoice[],
  activeOnly: boolean,
): SerializedModifierGroup | null {
  if (activeOnly && !group.active) return null;

  const groupChoices = choices
    .filter((c) => c.modifierGroupId === group.id)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

  const visibleChoices = activeOnly
    ? groupChoices.filter((c) => c.active)
    : groupChoices;

  if (activeOnly && visibleChoices.length === 0) return null;

  return {
    id: group.id,
    businessId: group.businessId,
    name: group.name,
    description: group.description,
    selectionType: group.selectionType,
    required: group.required,
    maxSelections: group.maxSelections,
    active: group.active,
    sortOrder: group.sortOrder,
    choices: visibleChoices.map(serializeChoice),
  };
}

export async function loadModifierGroupsForBusiness(
  businessId: number,
  options: { activeOnly?: boolean } = {},
): Promise<SerializedModifierGroup[]> {
  const activeOnly = options.activeOnly ?? false;
  const groups = await db
    .select()
    .from(modifierGroupsTable)
    .where(eq(modifierGroupsTable.businessId, businessId))
    .orderBy(asc(modifierGroupsTable.sortOrder), asc(modifierGroupsTable.id));

  if (groups.length === 0) return [];

  const choices = await db
    .select()
    .from(modifierChoicesTable)
    .where(inArray(modifierChoicesTable.modifierGroupId, groups.map((g) => g.id)))
    .orderBy(asc(modifierChoicesTable.sortOrder), asc(modifierChoicesTable.id));

  return groups
    .map((g) => serializeModifierGroup(g, choices, activeOnly))
    .filter((g): g is SerializedModifierGroup => g !== null);
}

export async function loadAssignedModifierGroupsByProductIds(
  productIds: number[],
): Promise<Map<number, AssignedModifierGroupSummary[]>> {
  const result = new Map<number, AssignedModifierGroupSummary[]>();
  if (productIds.length === 0) return result;

  const assignments = await db
    .select()
    .from(productModifierGroupsTable)
    .where(inArray(productModifierGroupsTable.productId, productIds))
    .orderBy(asc(productModifierGroupsTable.sortOrder), asc(productModifierGroupsTable.id));

  if (assignments.length === 0) {
    for (const id of productIds) result.set(id, []);
    return result;
  }

  const groupIds = [...new Set(assignments.map((a) => a.modifierGroupId))];
  const groups = await db
    .select()
    .from(modifierGroupsTable)
    .where(inArray(modifierGroupsTable.id, groupIds));
  const groupById = new Map(groups.map((g) => [g.id, g]));

  for (const productId of productIds) {
    const assigned = assignments
      .filter((a) => a.productId === productId)
      .map((a) => {
        const group = groupById.get(a.modifierGroupId);
        if (!group) return null;
        return {
          id: group.id,
          name: group.name,
          active: group.active,
          sortOrder: a.sortOrder,
        };
      })
      .filter((v): v is AssignedModifierGroupSummary => v !== null);
    result.set(productId, assigned);
  }

  return result;
}

export async function loadOptionGroupsByProductIds(
  productIds: number[],
  options: { activeOnly?: boolean } = {},
): Promise<Map<number, SerializedProductOptionGroup[]>> {
  const activeOnly = options.activeOnly ?? true;
  const result = new Map<number, SerializedProductOptionGroup[]>();
  if (productIds.length === 0) return result;

  const assignments = await db
    .select()
    .from(productModifierGroupsTable)
    .where(inArray(productModifierGroupsTable.productId, productIds))
    .orderBy(asc(productModifierGroupsTable.sortOrder), asc(productModifierGroupsTable.id));

  if (assignments.length === 0) {
    for (const id of productIds) result.set(id, []);
    return result;
  }

  const groupIds = [...new Set(assignments.map((a) => a.modifierGroupId))];
  const groups = await db
    .select()
    .from(modifierGroupsTable)
    .where(inArray(modifierGroupsTable.id, groupIds));

  const choices = await db
    .select()
    .from(modifierChoicesTable)
    .where(inArray(modifierChoicesTable.modifierGroupId, groupIds))
    .orderBy(asc(modifierChoicesTable.sortOrder), asc(modifierChoicesTable.id));

  const groupById = new Map(groups.map((g) => [g.id, g]));

  for (const productId of productIds) {
    const productGroups = assignments
      .filter((a) => a.productId === productId)
      .map((a) => {
        const group = groupById.get(a.modifierGroupId);
        if (!group) return null;
        return modifierGroupToOptionGroup(group, choices, a.sortOrder, activeOnly);
      })
      .filter((g): g is SerializedProductOptionGroup => g !== null);
    result.set(productId, productGroups);
  }

  return result;
}

export async function assignModifierGroupsToProduct(
  productId: number,
  businessId: number,
  modifierGroupIds: number[],
): Promise<AssignedModifierGroupSummary[]> {
  if (modifierGroupIds.length > 0) {
    const groups = await db
      .select({ id: modifierGroupsTable.id })
      .from(modifierGroupsTable)
      .where(
        and(
          eq(modifierGroupsTable.businessId, businessId),
          inArray(modifierGroupsTable.id, modifierGroupIds),
        ),
      );

    if (groups.length !== modifierGroupIds.length) {
      throw new Error("One or more modifier groups were not found for this business");
    }
  }

  await db
    .delete(productModifierGroupsTable)
    .where(eq(productModifierGroupsTable.productId, productId));

  for (let i = 0; i < modifierGroupIds.length; i++) {
    await db.insert(productModifierGroupsTable).values({
      productId,
      modifierGroupId: modifierGroupIds[i],
      sortOrder: i,
    });
  }

  const assigned = await loadAssignedModifierGroupsByProductIds([productId]);
  return assigned.get(productId) ?? [];
}

export async function replaceModifierGroupChoices(
  modifierGroupId: number,
  inputChoices: ModifierChoiceInput[],
): Promise<SerializedModifierChoice[]> {
  await db
    .delete(modifierChoicesTable)
    .where(eq(modifierChoicesTable.modifierGroupId, modifierGroupId));

  const created: SerializedModifierChoice[] = [];
  for (let i = 0; i < inputChoices.length; i++) {
    const input = inputChoices[i];
    const name = input.name?.trim();
    if (!name) continue;

    const [row] = await db
      .insert(modifierChoicesTable)
      .values({
        modifierGroupId,
        name,
        priceAdjustment: String(input.priceAdjustment ?? 0),
        active: input.active ?? true,
        sortOrder: input.sortOrder ?? i,
      })
      .returning();

    created.push(serializeChoice(row));
  }

  return created;
}

export async function createModifierGroup(
  businessId: number,
  input: ModifierGroupInput,
): Promise<SerializedModifierGroup> {
  const name = input.name.trim();
  const selectionType = input.selectionType ?? "SINGLE";

  const [group] = await db
    .insert(modifierGroupsTable)
    .values({
      businessId,
      name,
      description: input.description?.trim() || null,
      selectionType,
      required: input.required ?? false,
      maxSelections: selectionType === "MULTIPLE" ? (input.maxSelections ?? null) : null,
      active: input.active ?? true,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();

  const choices = await replaceModifierGroupChoices(group.id, input.choices ?? []);
  const choiceRows = await db
    .select()
    .from(modifierChoicesTable)
    .where(eq(modifierChoicesTable.modifierGroupId, group.id));
  return serializeModifierGroup(group, choiceRows, false)!;
}

export async function updateModifierGroupRecord(
  businessId: number,
  modifierGroupId: number,
  input: Partial<ModifierGroupInput>,
): Promise<SerializedModifierGroup | null> {
  const [existing] = await db
    .select()
    .from(modifierGroupsTable)
    .where(
      and(
        eq(modifierGroupsTable.id, modifierGroupId),
        eq(modifierGroupsTable.businessId, businessId),
      ),
    );

  if (!existing) return null;

  const selectionType = input.selectionType ?? existing.selectionType;
  const updateData: Partial<typeof modifierGroupsTable.$inferInsert> = {};

  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.description !== undefined) updateData.description = input.description.trim() || null;
  if (input.selectionType !== undefined) updateData.selectionType = input.selectionType;
  if (input.required !== undefined) updateData.required = input.required;
  if (input.active !== undefined) updateData.active = input.active;
  if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
  updateData.maxSelections =
    selectionType === "MULTIPLE"
      ? (input.maxSelections ?? existing.maxSelections)
      : null;

  const [group] = await db
    .update(modifierGroupsTable)
    .set(updateData)
    .where(eq(modifierGroupsTable.id, modifierGroupId))
    .returning();

  let choiceRows: ModifierChoice[];
  if (input.choices !== undefined) {
    await replaceModifierGroupChoices(modifierGroupId, input.choices);
    choiceRows = await db
      .select()
      .from(modifierChoicesTable)
      .where(eq(modifierChoicesTable.modifierGroupId, modifierGroupId));
  } else {
    choiceRows = await db
      .select()
      .from(modifierChoicesTable)
      .where(eq(modifierChoicesTable.modifierGroupId, modifierGroupId));
  }

  return serializeModifierGroup(group, choiceRows, false)!;
}

export async function deleteModifierGroupRecord(
  businessId: number,
  modifierGroupId: number,
): Promise<boolean> {
  const [existing] = await db
    .select({ id: modifierGroupsTable.id })
    .from(modifierGroupsTable)
    .where(
      and(
        eq(modifierGroupsTable.id, modifierGroupId),
        eq(modifierGroupsTable.businessId, businessId),
      ),
    );

  if (!existing) return false;

  await db
    .delete(productModifierGroupsTable)
    .where(eq(productModifierGroupsTable.modifierGroupId, modifierGroupId));
  await db
    .delete(modifierChoicesTable)
    .where(eq(modifierChoicesTable.modifierGroupId, modifierGroupId));
  await db.delete(modifierGroupsTable).where(eq(modifierGroupsTable.id, modifierGroupId));
  return true;
}

export async function clearProductModifierGroups(productId: number): Promise<void> {
  await db
    .delete(productModifierGroupsTable)
    .where(eq(productModifierGroupsTable.productId, productId));
}
