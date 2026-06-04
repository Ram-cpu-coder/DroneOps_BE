import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { created, ok } from "../utils/apiResponse.js";

export const list = asyncHandler(async (req, res) => {
  const records = await prisma.maintenanceRecord.findMany({
    where: { organisationId: req.user.organisationId },
    include: { drone: true, assignedTo: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "desc" }
  });
  return ok(res, records);
});

export const create = asyncHandler(async (req, res) => {
  const record = await prisma.maintenanceRecord.create({
    data: { organisationId: req.user.organisationId, ...req.body }
  });
  return created(res, record, "Maintenance record created");
});

export const update = asyncHandler(async (req, res) => {
  const record = await prisma.maintenanceRecord.update({
    where: { id: req.params.id },
    data: req.body
  });
  return ok(res, record, "Maintenance record updated");
});
