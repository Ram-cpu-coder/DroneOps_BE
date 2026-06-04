import { writeAudit } from "../services/audit.service.js";
import * as missionService from "../services/mission.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { created, ok } from "../utils/apiResponse.js";

export const list = asyncHandler(async (req, res) => {
  const missions = await missionService.listMissions(req.user.organisationId);
  return ok(res, missions);
});

export const create = asyncHandler(async (req, res) => {
  const mission = await missionService.createMission(req.user.organisationId, req.validated.body);
  await writeAudit({
    organisationId: req.user.organisationId,
    actorId: req.user.id,
    action: "MISSION_CREATED",
    entityType: "MISSION",
    entityId: mission.id,
    metadata: { missionCode: mission.missionCode }
  });
  return created(res, mission, "Mission created");
});

export const update = asyncHandler(async (req, res) => {
  const mission = await missionService.updateMission(req.user.organisationId, req.params.id, req.body);
  await writeAudit({
    organisationId: req.user.organisationId,
    actorId: req.user.id,
    action: "MISSION_UPDATED",
    entityType: "MISSION",
    entityId: mission.id,
    metadata: { fields: Object.keys(req.body) }
  });
  return ok(res, mission, "Mission updated");
});

export const start = asyncHandler(async (req, res) => {
  const mission = await missionService.startMission(req.user.organisationId, req.params.id);
  await writeAudit({
    organisationId: req.user.organisationId,
    actorId: req.user.id,
    action: "MISSION_STARTED",
    entityType: "MISSION",
    entityId: mission.id
  });
  return ok(res, mission, "Mission started");
});

export const complete = asyncHandler(async (req, res) => {
  const mission = await missionService.completeMission(req.user.organisationId, req.params.id);
  await writeAudit({
    organisationId: req.user.organisationId,
    actorId: req.user.id,
    action: "MISSION_COMPLETED",
    entityType: "MISSION",
    entityId: mission.id
  });
  return ok(res, mission, "Mission completed");
});
