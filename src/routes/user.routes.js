import { Router } from "express";
import * as userController from "../controllers/user.controller.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

export const userRouter = Router();

userRouter.use(requireAuth);
userRouter.get("/", requirePermission("*"), userController.list);
