import { Router } from "express";
import multer from "multer";
import { BannerValidationError, getBannerMediaInput, parseBannerImagePatch, parseBannerInput } from "./validation.js";
import { BannerDomainError, addBannerImage, attachStagedBannerImages, changeBannerImage, createBanner, getBanner, listBanners, removeBanner, removeBannerImage, removeStagedBannerImage, stageBannerImage, updateBanner } from "./service.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: 8 * 1024 * 1024 } });
const route = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

router.get("/stores/:storeId/banners", route(async (req, res) => res.json({ banners: await listBanners({ storeId: req.params.storeId, userId: req.user.id }) })));
router.get("/stores/:storeId/banners/:bannerId", route(async (req, res) => res.json({ banner: await getBanner({ storeId: req.params.storeId, bannerId: req.params.bannerId, userId: req.user.id }) })));
router.post("/stores/:storeId/banners/media", upload.single("file"), route(async (req, res) => {
  const draftId = String(req.body?.draftId || "").trim();
  if (!/^[a-f0-9-]{36}$/i.test(draftId)) throw new BannerValidationError("Rascunho de banner inválido.");
  return res.status(201).json({ image: await stageBannerImage({ storeId: req.params.storeId, userId: req.user.id, file: req.file, draftId, mediaInput: getBannerMediaInput(req.body, req.file) }) });
}));
router.delete("/stores/:storeId/banners/media/:uploadId", route(async (req, res) => {
  await removeStagedBannerImage({ storeId: req.params.storeId, uploadId: req.params.uploadId, userId: req.user.id });
  return res.json({ ok: true });
}));
router.post("/stores/:storeId/banners", route(async (req, res) => res.status(201).json({ banner: await createBanner({ storeId: req.params.storeId, userId: req.user.id, input: parseBannerInput(req.body) }) })));
router.post("/stores/:storeId/banners/:bannerId/media/attach", route(async (req, res) => {
  const input = parseBannerInput({ ...req.body, title: "Rascunho de vínculo", pages: ["home"], categoryIds: [], position: "top", active: true });
  return res.json({ images: await attachStagedBannerImages({ storeId: req.params.storeId, bannerId: req.params.bannerId, userId: req.user.id, draftId: input.draftId, uploadIds: input.uploadIds }) });
}));
router.patch("/stores/:storeId/banners/:bannerId", route(async (req, res) => res.json({ banner: await updateBanner({ storeId: req.params.storeId, bannerId: req.params.bannerId, userId: req.user.id, input: parseBannerInput(req.body) }) })));
router.delete("/stores/:storeId/banners/:bannerId", route(async (req, res) => {
  await removeBanner({ storeId: req.params.storeId, bannerId: req.params.bannerId, userId: req.user.id });
  return res.json({ ok: true });
}));
router.post("/stores/:storeId/banners/:bannerId/media", upload.single("file"), route(async (req, res) => res.status(201).json({ image: await addBannerImage({ storeId: req.params.storeId, bannerId: req.params.bannerId, userId: req.user.id, file: req.file, mediaInput: getBannerMediaInput(req.body, req.file) }) })));
router.patch("/stores/:storeId/banners/:bannerId/media/:imageId", route(async (req, res) => {
  const banner = await getBanner({ storeId: req.params.storeId, bannerId: req.params.bannerId, userId: req.user.id });
  const image = banner.images.find((item) => item.id === req.params.imageId);
  if (!image) throw new BannerDomainError(404, "Imagem não encontrada.");
  return res.json({ image: await changeBannerImage({ storeId: req.params.storeId, bannerId: req.params.bannerId, imageId: req.params.imageId, userId: req.user.id, patch: parseBannerImagePatch(req.body, image) }) });
}));
router.delete("/stores/:storeId/banners/:bannerId/media/:imageId", route(async (req, res) => {
  await removeBannerImage({ storeId: req.params.storeId, bannerId: req.params.bannerId, imageId: req.params.imageId, userId: req.user.id });
  return res.json({ ok: true });
}));
router.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 422).json({ error: error.code === "LIMIT_FILE_SIZE" ? "A imagem excede o tamanho máximo de 8 MB." : "Não foi possível processar o upload." });
  if (error instanceof BannerValidationError || error instanceof BannerDomainError) return res.status(error.status).json({ error: error.message });
  return next(error);
});

export default router;
