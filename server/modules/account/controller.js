import { Router } from "express"; const router = Router(); router.get("/account", (req, res) => res.json({ user: req.user || null })); export default router;
