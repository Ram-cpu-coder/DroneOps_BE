import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { hashPassword } from "../src/utils/passwords.js";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const main = async () => {
  const passwordHash = await hashPassword("Password123!");

  const organisation = await prisma.organisation.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      name: "DroneOps Demo",
      industry: "Enterprise drone operations"
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@droneops.test" },
    update: {},
    create: {
      organisationId: organisation.id,
      name: "System Administrator",
      email: "admin@droneops.test",
      passwordHash,
      role: "SYSTEM_ADMINISTRATOR",
      isVerified: true
    }
  });

  await prisma.user.upsert({
    where: { email: "ops@droneops.test" },
    update: {},
    create: {
      organisationId: organisation.id,
      name: "Olivia Hart",
      email: "ops@droneops.test",
      passwordHash,
      role: "OPERATIONS_MANAGER",
      isVerified: true
    }
  });

  const pilot = await prisma.user.upsert({
    where: { email: "pilot@droneops.test" },
    update: {},
    create: {
      organisationId: organisation.id,
      name: "Maya Chen",
      email: "pilot@droneops.test",
      passwordHash,
      role: "REMOTE_PILOT",
      isVerified: true
    }
  });

  const drone = await prisma.drone.upsert({
    where: { organisationId_droneCode: { organisationId: organisation.id, droneCode: "DRN-001" } },
    update: {},
    create: {
      organisationId: organisation.id,
      droneCode: "DRN-001",
      model: "AeroScan X4",
      manufacturer: "AeroVision",
      serialNumber: "AV-X4-2026-001",
      batteryType: "Li-ion 6S",
      firmwareVersion: "v12.4.1",
      status: "AVAILABLE",
      certificationStatus: "CERTIFIED"
    }
  });

  const mission = await prisma.mission.upsert({
    where: { organisationId_missionCode: { organisationId: organisation.id, missionCode: "MSN-1001" } },
    update: {},
    create: {
      organisationId: organisation.id,
      missionCode: "MSN-1001",
      name: "North Ridge Survey",
      type: "Mapping",
      status: "APPROVED",
      droneId: drone.id,
      pilotId: pilot.id,
      operatingArea: "Sydney Region",
      plannedRoute: [
        { latitude: -33.8688, longitude: 151.2093, altitude: 120 },
        { latitude: -33.8662, longitude: 151.2131, altitude: 118 }
      ]
    }
  });

  await prisma.riskAssessment.upsert({
    where: { missionId: mission.id },
    update: {},
    create: {
      organisationId: organisation.id,
      missionId: mission.id,
      level: "LOW",
      hazards: [{ category: "Weather", score: 2 }],
      mitigations: [{ control: "Monitor wind speed before launch" }],
      approvedById: admin.id,
      approvedAt: new Date()
    }
  });

  await prisma.geofence.createMany({
    data: [
      {
        organisationId: organisation.id,
        name: "Sydney Restricted Demo Zone",
        type: "RESTRICTED",
        polygon: [
          [151.206, -33.871],
          [151.214, -33.871],
          [151.214, -33.864],
          [151.206, -33.864],
          [151.206, -33.871]
        ]
      }
    ],
    skipDuplicates: true
  });

  await prisma.telemetryLog.create({
    data: {
      organisationId: organisation.id,
      droneId: drone.id,
      missionId: mission.id,
      timestamp: new Date(),
      latitude: -33.8688,
      longitude: 151.2093,
      altitude: 120.5,
      speed: 12.4,
      heading: 85,
      batteryLevel: 78,
      batteryVoltage: 11.2,
      signalStrength: 92,
      linkQuality: "GOOD",
      status: "IN_FLIGHT",
      rawPayload: {}
    }
  });
};

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
