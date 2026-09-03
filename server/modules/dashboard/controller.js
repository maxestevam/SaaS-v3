import { Router } from "express";
import { getDashboardForUser } from "./service.js";

const router = Router();
router.get("/dashboard", async (req, res, next) => {
  try { return res.json(await getDashboardForUser(req.user.id)); } catch (error) { return next(error); }
});

export { getDashboardForUser };
export default router;
