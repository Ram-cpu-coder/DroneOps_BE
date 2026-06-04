import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

const assignableStatuses = ["AVAILABLE"];

export const listDrones = (organisationId) => {
  return prisma.drone.findMany({
    where: { organisationId },
    orderBy: { createdAt: "desc" }
  });
};

export const createDrone = async (organisationId, data) => {
  return prisma.drone.create({
    data: {
      organisationId,
      droneCode: data.droneCode,
      model: data.model,
      manufacturer: data.manufacturer,
      serialNumber: data.serialNumber,
      batteryType: data.batteryType,
      firmwareVersion: data.firmwareVersion,
      status: data.status,
      flightHours: data.flightHours,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      certificationStatus: data.certificationStatus
    }
  });
};

export const updateDrone = async (organisationId, id, data) => {
  await ensureDroneExists(organisationId, id);
  return prisma.drone.update({ where: { id }, data });
};

export const deleteDrone = async (organisationId, id) => {
  await ensureDroneExists(organisationId, id);
  return prisma.drone.delete({ where: { id } });
};

export const ensureDroneAssignable = async (organisationId, droneId) => {
  const drone = await ensureDroneExists(organisationId, droneId);
  if (!assignableStatuses.includes(drone.status)) {
    throw new AppError(`Drone ${drone.droneCode} is not available for mission assignment`, 409, "DRONE_NOT_ASSIGNABLE");
  }
  return drone;
};

export const groundDrone = async (organisationId, droneId, reason) => {
  return prisma.drone.update({
    where: { id: droneId },
    data: {
      status: "GROUNDED",
      defects: {
        create: {
          organisationId,
          title: reason,
          severity: "CRITICAL"
        }
      }
    }
  });
};

export const ensureDroneExists = async (organisationId, id) => {
  const drone = await prisma.drone.findFirst({ where: { id, organisationId } });
  if (!drone) throw new AppError("Drone not found", 404, "DRONE_NOT_FOUND");
  return drone;
};
