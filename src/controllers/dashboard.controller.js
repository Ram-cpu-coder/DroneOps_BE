import * as dashboardService from "../services/dashboard.service.js";
import { ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const overview = asyncHandler(async (req, res) => {
  const overviewData = await dashboardService.getDashboardOverview(req.user.organisationId);
  return ok(res, overviewData, "Dashboard overview");
});
