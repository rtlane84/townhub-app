import { Router, type IRouter } from "express";
import {
  ListModifierGroupsParams,
  CreateModifierGroupParams,
  CreateModifierGroupBody,
  UpdateModifierGroupParams,
  UpdateModifierGroupBody,
  DeleteModifierGroupParams,
} from "@workspace/api-zod";
import {
  loadModifierGroupsForBusiness,
  createModifierGroup,
  updateModifierGroupRecord,
  deleteModifierGroupRecord,
} from "../lib/product-options";
import { requireBusinessCatalogAccess } from "../middlewares/requireBusinessCatalogAccess";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

router.get(
  "/businesses/:businessId/modifier-groups",
  async (req, res): Promise<void> => {
    const params = ListModifierGroupsParams.safeParse({
      businessId: parseId(req.params.businessId),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const groups = await loadModifierGroupsForBusiness(params.data.businessId);
    res.json(groups);
  },
);

router.post(
  "/businesses/:businessId/modifier-groups",
  requireBusinessCatalogAccess,
  async (req, res): Promise<void> => {
    const params = CreateModifierGroupParams.safeParse({
      businessId: parseId(req.params.businessId),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = CreateModifierGroupBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const group = await createModifierGroup(params.data.businessId, parsed.data);
    res.status(201).json(group);
  },
);

router.patch(
  "/businesses/:businessId/modifier-groups/:id",
  requireBusinessCatalogAccess,
  async (req, res): Promise<void> => {
    const params = UpdateModifierGroupParams.safeParse({
      businessId: parseId(req.params.businessId),
      id: parseId(req.params.id),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateModifierGroupBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const group = await updateModifierGroupRecord(
      params.data.businessId,
      params.data.id,
      parsed.data,
    );

    if (!group) {
      res.status(404).json({ error: "Modifier group not found" });
      return;
    }

    res.json(group);
  },
);

router.delete(
  "/businesses/:businessId/modifier-groups/:id",
  requireBusinessCatalogAccess,
  async (req, res): Promise<void> => {
    const params = DeleteModifierGroupParams.safeParse({
      businessId: parseId(req.params.businessId),
      id: parseId(req.params.id),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const deleted = await deleteModifierGroupRecord(params.data.businessId, params.data.id);
    if (!deleted) {
      res.status(404).json({ error: "Modifier group not found" });
      return;
    }

    res.sendStatus(204);
  },
);

export default router;
