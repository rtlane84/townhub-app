import { Router, type IRouter } from "express";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListProductsParams,
  CreateProductParams,
  CreateProductBody,
  UpdateProductParams,
  UpdateProductBody,
  DeleteProductParams,
  ListCategoriesParams,
  CreateCategoryParams,
  CreateCategoryBody,
  UpdateCategoryParams,
  UpdateCategoryBody,
  DeleteCategoryParams,
} from "@workspace/api-zod";
import { serializeProduct } from "./businesses";
import {
  loadOptionGroupsByProductIds,
  loadAssignedModifierGroupsByProductIds,
  assignModifierGroupsToProduct,
  clearProductModifierGroups,
} from "../lib/product-options";
import { requireBusinessCatalogAccess } from "../middlewares/requireBusinessCatalogAccess";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

// ─── Categories ─────────────────────────────────────────────────────────────

// GET /api/businesses/:businessId/categories
router.get(
  "/businesses/:businessId/categories",
  async (req, res): Promise<void> => {
    const params = ListCategoriesParams.safeParse({
      businessId: parseId(req.params.businessId),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const categories = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.businessId, params.data.businessId))
      .orderBy(categoriesTable.sortOrder, categoriesTable.name);

    res.json(categories);
  },
);

// POST /api/businesses/:businessId/categories
router.post(
  "/businesses/:businessId/categories",
  requireBusinessCatalogAccess,
  async (req, res): Promise<void> => {
    const params = CreateCategoryParams.safeParse({
      businessId: parseId(req.params.businessId),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = CreateCategoryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [category] = await db
      .insert(categoriesTable)
      .values({
        businessId: params.data.businessId,
        name: parsed.data.name,
        sortOrder: parsed.data.sortOrder ?? 0,
      })
      .returning();

    res.status(201).json(category);
  },
);

// PATCH /api/businesses/:businessId/categories/:id
router.patch(
  "/businesses/:businessId/categories/:id",
  requireBusinessCatalogAccess,
  async (req, res): Promise<void> => {
    const params = UpdateCategoryParams.safeParse({
      businessId: parseId(req.params.businessId),
      id: parseId(req.params.id),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateCategoryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [category] = await db
      .update(categoriesTable)
      .set(parsed.data)
      .where(
        and(
          eq(categoriesTable.id, params.data.id),
          eq(categoriesTable.businessId, params.data.businessId),
        ),
      )
      .returning();

    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    res.json(category);
  },
);

// DELETE /api/businesses/:businessId/categories/:id
router.delete(
  "/businesses/:businessId/categories/:id",
  requireBusinessCatalogAccess,
  async (req, res): Promise<void> => {
    const params = DeleteCategoryParams.safeParse({
      businessId: parseId(req.params.businessId),
      id: parseId(req.params.id),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    await db
      .delete(categoriesTable)
      .where(
        and(
          eq(categoriesTable.id, params.data.id),
          eq(categoriesTable.businessId, params.data.businessId),
        ),
      );

    res.sendStatus(204);
  },
);

// ─── Products ─────────────────────────────────────────────────────────────

// GET /api/businesses/:businessId/products
router.get(
  "/businesses/:businessId/products",
  async (req, res): Promise<void> => {
    const params = ListProductsParams.safeParse({
      businessId: parseId(req.params.businessId),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    // Support optional query params server-side
    const { categoryId, available, featured } = req.query as Record<
      string,
      string
    >;
    const conditions = [eq(productsTable.businessId, params.data.businessId)];
    if (categoryId) conditions.push(eq(productsTable.categoryId, parseInt(categoryId, 10)));
    if (available === "true") conditions.push(eq(productsTable.available, true));
    if (featured === "true") conditions.push(eq(productsTable.featured, true));

    const products = await db
      .select()
      .from(productsTable)
      .where(and(...conditions))
      .orderBy(productsTable.featured, productsTable.name);

    const productIds = products.map((p) => p.id);
    const [optionGroupsByProduct, assignedByProduct] = await Promise.all([
      loadOptionGroupsByProductIds(productIds, { activeOnly: false }),
      loadAssignedModifierGroupsByProductIds(productIds),
    ]);

    res.json(
      products.map((p) =>
        serializeProduct(
          p,
          optionGroupsByProduct.get(p.id) ?? [],
          assignedByProduct.get(p.id) ?? [],
        ),
      ),
    );
  },
);

// POST /api/businesses/:businessId/products
router.post(
  "/businesses/:businessId/products",
  requireBusinessCatalogAccess,
  async (req, res): Promise<void> => {
    const params = CreateProductParams.safeParse({
      businessId: parseId(req.params.businessId),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = CreateProductBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [product] = await db
      .insert(productsTable)
      .values({
        businessId: params.data.businessId,
        name: parsed.data.name,
        description: parsed.data.description,
        price: String(parsed.data.price),
        categoryId: parsed.data.categoryId,
        imageUrl: parsed.data.imageUrl,
        available: parsed.data.available ?? true,
        featured: parsed.data.featured ?? false,
        prepTimeMinutes: parsed.data.prepTimeMinutes,
      })
      .returning();

    const modifierGroupIds = parsed.data.modifierGroupIds ?? [];
    if (modifierGroupIds.length > 0) {
      try {
        await assignModifierGroupsToProduct(
          product.id,
          params.data.businessId,
          modifierGroupIds,
        );
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : "Invalid modifier groups" });
        return;
      }
    }

    const [optionGroupsByProduct, assignedByProduct] = await Promise.all([
      loadOptionGroupsByProductIds([product.id], { activeOnly: false }),
      loadAssignedModifierGroupsByProductIds([product.id]),
    ]);

    res.status(201).json(
      serializeProduct(
        product,
        optionGroupsByProduct.get(product.id) ?? [],
        assignedByProduct.get(product.id) ?? [],
      ),
    );
  },
);

// PATCH /api/businesses/:businessId/products/:id
router.patch(
  "/businesses/:businessId/products/:id",
  requireBusinessCatalogAccess,
  async (req, res): Promise<void> => {
    const params = UpdateProductParams.safeParse({
      businessId: parseId(req.params.businessId),
      id: parseId(req.params.id),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateProductBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const updateData: Record<string, unknown> = {};
    const d = parsed.data;
    if (d.name !== undefined) updateData.name = d.name;
    if (d.description !== undefined) updateData.description = d.description;
    if (d.price !== undefined) updateData.price = String(d.price);
    if (d.categoryId !== undefined) updateData.categoryId = d.categoryId;
    if (d.imageUrl !== undefined) updateData.imageUrl = d.imageUrl;
    if (d.available !== undefined) updateData.available = d.available;
    if (d.featured !== undefined) updateData.featured = d.featured;
    if (d.prepTimeMinutes !== undefined) updateData.prepTimeMinutes = d.prepTimeMinutes;

    const [product] = await db
      .update(productsTable)
      .set(updateData as never)
      .where(
        and(
          eq(productsTable.id, params.data.id),
          eq(productsTable.businessId, params.data.businessId),
        ),
      )
      .returning();

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    if (d.modifierGroupIds !== undefined) {
      try {
        await assignModifierGroupsToProduct(
          product.id,
          params.data.businessId,
          d.modifierGroupIds,
        );
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : "Invalid modifier groups" });
        return;
      }
    }

    const [optionGroupsByProduct, assignedByProduct] = await Promise.all([
      loadOptionGroupsByProductIds([product.id], { activeOnly: false }),
      loadAssignedModifierGroupsByProductIds([product.id]),
    ]);

    res.json(
      serializeProduct(
        product,
        optionGroupsByProduct.get(product.id) ?? [],
        assignedByProduct.get(product.id) ?? [],
      ),
    );
  },
);

// DELETE /api/businesses/:businessId/products/:id
router.delete(
  "/businesses/:businessId/products/:id",
  requireBusinessCatalogAccess,
  async (req, res): Promise<void> => {
    const params = DeleteProductParams.safeParse({
      businessId: parseId(req.params.businessId),
      id: parseId(req.params.id),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    await clearProductModifierGroups(params.data.id);

    await db
      .delete(productsTable)
      .where(
        and(
          eq(productsTable.id, params.data.id),
          eq(productsTable.businessId, params.data.businessId),
        ),
      );

    res.sendStatus(204);
  },
);

export default router;
