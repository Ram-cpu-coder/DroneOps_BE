import * as alertSettingsService from "../services/alertSettings.service.js";
import { writeAudit } from "../services/audit.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";

export const getAlertThresholds = asyncHandler(async (req, res) => {
  const thresholds = await alertSettingsService.getAlertThresholds(req.user.organisationId);
  return ok(res, thresholds, "Alert thresholds");
});

export const updateAlertThresholds = asyncHandler(async (req, res) => {
  const thresholds = await alertSettingsService.updateAlertThresholds(req.user.organisationId, req.body);

  await writeAudit({
    organisationId: req.user.organisationId,
    actorId: req.user.id,
    action: "ALERT_THRESHOLDS_UPDATED",
    entityType: "SETTINGS",
    entityId: req.user.organisationId,
    metadata: thresholds
  });

  return ok(res, thresholds, "Alert thresholds updated");
});
