import { verifySession } from "../../auth.js";
import { isSessionValid } from "./service.js";

export async function requireUser(req, res, next) {
  try {
    const authorization = req.header("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Autenticação necessária." });
    }

    const user = await verifySession(authorization.slice(7), process.env.JWT_SECRET);
    if (!user.id) {
      return res.status(401).json({ error: "Sessão inválida." });
    }
    if (!(await isSessionValid(user))) {
      return res.status(401).json({ error: "Esta sessão foi revogada. Entre novamente para continuar." });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: "Sessão inválida ou expirada." });
  }
}
