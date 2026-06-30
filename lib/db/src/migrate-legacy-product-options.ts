import { db } from "./index";
import { productsTable } from "./schema/products";
import {
  productOptionGroupsTable,
  productOptionsTable,
} from "./schema/product-options";
import {
  modifierGroupsTable,
  modifierChoicesTable,
  productModifierGroupsTable,
} from "./schema/modifier-groups";
import { eq, inArray, and, sql } from "drizzle-orm";

type LegacyChoice = {
  name: string;
  priceAdjustment: string;
  available: boolean;
  sortOrder: number;
};

function choicesFingerprint(choices: LegacyChoice[]): string {
  return JSON.stringify(
    [...choices]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map((c) => ({
        name: c.name,
        priceAdjustment: c.priceAdjustment,
        available: c.available,
      })),
  );
}

function inferSelectionType(minSelections: number, maxSelections: number): "SINGLE" | "MULTIPLE" {
  return maxSelections <= 1 ? "SINGLE" : "MULTIPLE";
}

/**
 * One-time migration from embedded product_option_groups to reusable modifier_groups.
 * Idempotent: skips when product_modifier_groups already has rows.
 */
export async function migrateLegacyProductOptionsToModifierGroups(): Promise<void> {
  const [{ count: assignmentCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productModifierGroupsTable);

  if (Number(assignmentCount) > 0) return;

  const legacyGroups = await db.select().from(productOptionGroupsTable);
  if (legacyGroups.length === 0) return;

  const legacyOptions = await db.select().from(productOptionsTable);
  const optionsByGroupId = new Map<number, LegacyChoice[]>();
  for (const opt of legacyOptions) {
    const list = optionsByGroupId.get(opt.groupId) ?? [];
    list.push({
      name: opt.name,
      priceAdjustment: opt.priceAdjustment,
      available: opt.available,
      sortOrder: opt.sortOrder,
    });
    optionsByGroupId.set(opt.groupId, list);
  }

  const products = await db.select().from(productsTable);
  const businessByProductId = new Map(products.map((p) => [p.id, p.businessId]));

  type GroupKey = string;
  const modifierGroupIdByKey = new Map<GroupKey, number>();

  for (const legacyGroup of legacyGroups) {
    const businessId = businessByProductId.get(legacyGroup.productId);
    if (!businessId) continue;

    const choices = optionsByGroupId.get(legacyGroup.id) ?? [];
    const selectionType = inferSelectionType(legacyGroup.minSelections, legacyGroup.maxSelections);
    const key = [
      businessId,
      legacyGroup.name.trim().toLowerCase(),
      legacyGroup.required,
      selectionType,
      selectionType === "MULTIPLE" ? legacyGroup.maxSelections : 1,
      choicesFingerprint(choices),
    ].join("|");

    let modifierGroupId = modifierGroupIdByKey.get(key);
    if (!modifierGroupId) {
      const [created] = await db
        .insert(modifierGroupsTable)
        .values({
          businessId,
          name: legacyGroup.name,
          selectionType,
          required: legacyGroup.required,
          maxSelections: selectionType === "MULTIPLE" ? legacyGroup.maxSelections : null,
          active: true,
          sortOrder: legacyGroup.sortOrder,
        })
        .returning();

      modifierGroupId = created.id;
      modifierGroupIdByKey.set(key, modifierGroupId);

      for (const choice of [...choices].sort((a, b) => a.sortOrder - b.sortOrder)) {
        await db.insert(modifierChoicesTable).values({
          modifierGroupId,
          name: choice.name,
          priceAdjustment: choice.priceAdjustment,
          active: choice.available,
          sortOrder: choice.sortOrder,
        });
      }
    }

    const [existingLink] = await db
      .select({ id: productModifierGroupsTable.id })
      .from(productModifierGroupsTable)
      .where(
        and(
          eq(productModifierGroupsTable.productId, legacyGroup.productId),
          eq(productModifierGroupsTable.modifierGroupId, modifierGroupId),
        ),
      );

    if (!existingLink) {
      await db.insert(productModifierGroupsTable).values({
        productId: legacyGroup.productId,
        modifierGroupId,
        sortOrder: legacyGroup.sortOrder,
      });
    }
  }

  const legacyGroupIds = legacyGroups.map((g) => g.id);
  if (legacyGroupIds.length > 0) {
    await db
      .delete(productOptionsTable)
      .where(inArray(productOptionsTable.groupId, legacyGroupIds));
    await db.delete(productOptionGroupsTable);
  }
}
