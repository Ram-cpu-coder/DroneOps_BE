import { Router } from "express";
import * as maintenanceController from "../controllers/maintenance.controller.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

export const maintenanceRouter = Router();

maintenanceRouter.use(requireAuth);
maintenanceRouter.get("/", requirePermission("maintenance:manage"), maintenanceController.list);
maintenanceRouter.post("/", requirePermission("maintenance:manage"), maintenanceController.create);
maintenanceRouter.put("/:id", requirePermission("maintenance:manage"), maintenanceController.update);
