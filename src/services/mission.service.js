import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { ensureDroneAssignable } from "./drone.service.js";

export const listMissions = (organisationId) => {
  return prisma.mission.findMany({
    where: { organisationId },
    include: {
      drone: { select: { id: true, droneCode: true, status: true } },
      pilot: { select: { id: true, name: true, role: true } },
      riskAssessment: true
    },
    orderBy: { createdAt: "desc" }
  });
};

export const createMission = async (organisationId, data) => {
  if (data.droneId) await ensureDroneAssignable(organisationId, data.droneId);

  return prisma.$transaction(async (tx) => {
    const mission = await tx.mission.create({
      data: {
        organisationId,
        missionCode: data.missionCode,
        name: data.name,
        type: data.type,
        droneId: data.droneId,
        pilotId: data.pilotId,
        plannedRoute: data.plannedRoute,
        geofenceConfig: data.geofenceConfig,
        launchSite: data.launchSite,
        operatingArea: data.operatingArea,
        plannedStartAt: data.plannedStartAt ? new Date(data.plannedStartAt) : undefined,
        plannedEndAt: data.plannedEndAt ? new Date(data.plannedEndAt) : undefined
      }
    });

    if (data.droneId) {
      await tx.drone.update({
        where: { id: data.droneId },
        data: { status: "IN_MISSION" }
      });
    }

    return mission;
  });
};

export const updateMission = async (organisationId, id, data) => {
  await ensureMissionExists(organisationId, id);
  return prisma.mission.update({ where: { id }, data });
};

export const startMission = async (organisationId, id) => {
  const mission = await prisma.mission.findFirst({
    where: { id, organisationId },
    include: { riskAssessment: true, drone: true, pilot: true }
  });
  if (!mission) throw new AppError("Mission not found", 404, "MISSION_NOT_FOUND");
  if (!mission.droneId || !mission.pilotId) throw new AppError("Mission requires drone and pilot assignment", 409, "MISSION_ASSIGNMENT_REQUIRED");
  if (!mission.riskAssessment) throw new AppError("Risk assessment required before activation", 409, "RISK_ASSESSMENT_REQUIRED");
  if (!["APPROVED", "PLANNED"].includes(mission.status)) throw new AppError("Mission cannot be started from current status", 409, "INVALID_MISSION_STATUS");

  return prisma.mission.update({
    where: { id },
    data: { status: "ACTIVE" }
  });
};

export const completeMission = async (organisationId, id) => {
  const mission = await ensureMissionExists(organisationId, id);
  return prisma.$transaction(async (tx) => {
    const updated = await tx.mission.update({
      where: { id },
      data: { status: "COMPLETED", progress: 100 }
    });
    if (mission.droneId) {
      await tx.drone.update({ where: { id: mission.droneId }, data: { status: "AVAILABLE" } });
    }
    return updated;
  });
};

export const ensureMissionExists = async (organisationId, id) => {
  const mission = await prisma.mission.findFirst({ where: { id, organisationId } });
  if (!mission) throw new AppError("Mission not found", 404, "MISSION_NOT_FOUND");
  return mission;
};
