import { Router } from "express";
import * as documentController from "../controllers/document.controller.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { uploadSingleDocument } from "../middleware/upload.js";

export const documentRouter = Router();

documentRouter.use(requireAuth);
documentRouter.get("/", requirePermission("documents:read"), documentController.list);
documentRouter.post("/", requirePermission("documents:manage"), documentController.create);
documentRouter.post("/upload", requirePermission("documents:manage"), uploadSingleDocument, documentController.upload);
