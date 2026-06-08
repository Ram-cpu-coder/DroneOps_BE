import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { getTelemetryConnector } from "../connectors/connectorRegistry.js";
import { ingestTelemetry } from "./telemetry.service.js";

let connectorTimer = null;

export const pollActiveMissionTelemetry = async () => {
  const activeMissions = await prisma.mission.findMany({
    where: {
      status: "ACTIVE",
      drone: {
        telemetryProvider: { not: "NONE" },
        externalDeviceId: { not: null }
      }
    },
    include: { drone: true }
  });

  const results = await Promise.allSettled(
    activeMissions.map((mission) => pollMissionDrone(mission))
  );

  return results.map((result, index) => ({
    missionId: activeMissions[index]?.id,
    status: result.status,
    reason: result.status === "rejected" ? result.reason.message : undefined
  }));
};

export const startConnectorWorker = () => {
  if (!env.connectorWorkerEnabled || connectorTimer) return;

  connectorTimer = setInterval(() => {
    pollActiveMissionTelemetry().catch((error) => {
      console.error(`Telemetry connector worker failed: ${error.message}`);
    });
  }, env.connectorPollIntervalMs);

  console.log(`Telemetry connector worker started (${env.connectorPollIntervalMs} ms interval)`);
};

export const stopConnectorWorker = () => {
  if (!connectorTimer) return;
  clearInterval(connectorTimer);
  connectorTimer = null;
};

const pollMissionDrone = async (mission) => {
  const connector = getTelemetryConnector(mission.drone.telemetryProvider);
  if (!connector) {
    await markDroneConnectorStatus(mission.drone.id, "NOT_CONFIGURED");
    throw new Error(`No connector registered for ${mission.drone.telemetryProvider}`);
  }

  try {
    const payload = await connector.readLatestTelemetry(mission.drone, mission);
    await ingestTelemetry(mission.organisationId, {
      ...payload,
      mission_id: payload.mission_id ?? mission.missionCode
    });
    await markDroneConnectorStatus(mission.drone.id, "ONLINE");
  } catch (error) {
    await markDroneConnectorStatus(mission.drone.id, "DEGRADED");
    throw error;
  }
};

const markDroneConnectorStatus = (droneId, connectorStatus) => {
  return prisma.drone.update({
    where: { id: droneId },
    data: { connectorStatus }
  });
};
