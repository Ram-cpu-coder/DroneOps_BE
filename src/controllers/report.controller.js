import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { created, ok } from "../utils/apiResponse.js";

export const list = asyncHandler(async (req, res) => {
  const reports = await prisma.report.findMany({
    where: { organisationId: req.user.organisationId },
    orderBy: { createdAt: "desc" }
  });
  return ok(res, reports);
});

export const create = asyncHandler(async (req, res) => {
  const report = await prisma.report.create({
    data: {
      organisationId: req.user.organisationId,
      generatedById: req.user.id,
      ...req.body
    }
  });
  return created(res, report, "Report generated");
});

export const summary = asyncHandler(async (req, res) => {
  const [drones, missions, incidents, maintenance] = await Promise.all([
    prisma.drone.count({ where: { organisationId: req.user.organisationId } }),
    prisma.mission.count({ where: { organisationId: req.user.organisationId } }),
    prisma.incident.count({ where: { organisationId: req.user.organisationId, status: { not: "CLOSED" } } }),
    prisma.maintenanceRecord.count({ where: { organisationId: req.user.organisationId, status: { in: ["SCHEDULED", "OVERDUE"] } } })
  ]);

  return ok(res, { drones, missions, openIncidents: incidents, pendingMaintenance: maintenance }, "Operations summary");
});
