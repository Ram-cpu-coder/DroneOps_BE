import { prisma } from "../config/prisma.js";

const ACTIVE_MISSION_STATUSES = ["ACTIVE"];
const OPEN_INCIDENT_STATUSES = ["OPEN", "UNDER_REVIEW", "INVESTIGATION", "CORRECTIVE_ACTION"];
const PENDING_MAINTENANCE_STATUSES = ["SCHEDULED", "OVERDUE", "IN_PROGRESS"];

const selectDrone = {
  id: true,
  droneCode: true,
  model: true,
  manufacturer: true,
  status: true,
  batteryType: true,
  firmwareVersion: true,
  flightHours: true,
  certificationStatus: true,
  lastTelemetryAt: true,
  nextMaintenanceDate: true,
  createdAt: true
};

const selectMission = {
  id: true,
  missionCode: true,
  name: true,
  type: true,
  status: true,
  progress: true,
  plannedStartAt: true,
  plannedEndAt: true,
  drone: {
    select: {
      id: true,
      droneCode: true,
      model: true
    }
  },
  pilot: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  riskAssessment: {
    select: {
      level: true
    }
  }
};

const selectIncident = {
  id: true,
  incidentCode: true,
  title: true,
  type: true,
  severity: true,
  status: true,
  location: true,
  updatedAt: true,
  drone: {
    select: {
      id: true,
      droneCode: true
    }
  },
  assignedTo: {
    select: {
      id: true,
      name: true
    }
  }
};

const selectAuditLog = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  metadata: true,
  createdAt: true,
  actor: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  }
};

export const getDashboardOverview = async (organisationId) => {
  const [
    totalDrones,
    activeMissionsCount,
    openIncidentsCount,
    pendingMaintenanceCount,
    activeDrones,
    missionQueue,
    incidentWatch,
    recentActivity
  ] = await Promise.all([
    prisma.drone.count({ where: { organisationId } }),
    prisma.mission.count({ where: { organisationId, status: { in: ACTIVE_MISSION_STATUSES } } }),
    prisma.incident.count({ where: { organisationId, status: { in: OPEN_INCIDENT_STATUSES } } }),
    prisma.maintenanceRecord.count({ where: { organisationId, status: { in: PENDING_MAINTENANCE_STATUSES } } }),
    prisma.drone.findMany({
      where: { organisationId },
      select: selectDrone,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 5
    }),
    prisma.mission.findMany({
      where: {
        organisationId,
        status: { in: ["PLANNED", "APPROVED", "ACTIVE"] }
      },
      select: selectMission,
      orderBy: [{ plannedStartAt: "asc" }, { createdAt: "desc" }],
      take: 3
    }),
    prisma.incident.findMany({
      where: {
        organisationId,
        status: { in: OPEN_INCIDENT_STATUSES }
      },
      select: selectIncident,
      orderBy: { updatedAt: "desc" },
      take: 2
    }),
    prisma.auditLog.findMany({
      where: { organisationId },
      select: selectAuditLog,
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  return {
    metrics: {
      totalDrones,
      activeMissions: activeMissionsCount,
      openIncidents: openIncidentsCount,
      pendingMaintenance: pendingMaintenanceCount
    },
    activeDrones,
    missionQueue,
    incidentWatch,
    recentActivity
  };
};
