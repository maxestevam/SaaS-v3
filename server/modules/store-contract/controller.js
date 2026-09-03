import { Router } from "express";
import { CommercialRuleError } from "../../../shared/store-contract/commercial.js";
import { StoreContractError, getPublicCommercialPreview, getPublicStoreContract, getStoreContract } from "./service.js";

const router = Router();
const publicRouter = Router();
const handle = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

router.get("/stores/:storeId/contract", handle(async (req, res) => {
  const contract = await getStoreContract({ storeId: req.params.storeId, userId: req.user.id });
  return res.json({ contract });
}));

publicRouter.get("/public/stores/:slug/contract", handle(async (req, res) => {
  const contract = await getPublicStoreContract({ slug: req.params.slug });
  return res.json({ contract });
}));

publicRouter.post("/public/stores/:slug/commercial-preview", handle(async (req, res) => {
  const preview = await getPublicCommercialPreview({ slug: req.params.slug, input: req.body || {} });
  return res.json({ preview });
}));

const errorHandler = (error, _req, res, next) => error instanceof StoreContractError ? res.status(error.status).json({ error: error.message }) : error instanceof CommercialRuleError ? res.status(422).json({ error: error.message, code: error.code }) : next(error);
router.use(errorHandler);
publicRouter.use(errorHandler);

export { publicRouter as publicStoreContractRouter };
export default router;
