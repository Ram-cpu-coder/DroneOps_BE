import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const organisationId = process.argv[2];

if (!organisationId) {
  console.error('Usage: node scripts/seedOrgOperationalData.mjs <organisationId>');
  process.exit(1);
}

// This seed creates realistic operational data for one organisation so the
// frontend can show assigned drones, pilots, missions, and live telemetry.
const crewSeed = [
  {
    name: 'Ava Morgan',
    email: 'ava.morgan+droneops@demo.local',
    role: 'REMOTE_PILOT',
  },
  {
    name: 'Liam Chen',
    email: 'liam.chen+droneops@demo.local',
    role: 'REMOTE_PILOT',
  },
  {
    name: 'Sofia Patel',
    email: 'sofia.patel+droneops@demo.local',
    role: 'OPERATIONS_MANAGER',
  },
  {
    name: 'Noah Brooks',
    email: 'noah.brooks+droneops@demo.local',
    role: 'REMOTE_PILOT',
  },
];

const droneSeed = [
  {
    droneCode: 'DRN-OPS-201',
    model: 'DJI Matrice 350 RTK',
    manufacturer: 'DJI',
    serialNumber: 'DJI-OPS-201',
    batteryType: 'TB65 Intelligent Battery',
    firmwareVersion: '07.01.10.03',
    status: 'IN_MISSION',
    flightHours: 147.4,
    certificationStatus: 'CERTIFIED',
    telemetryProvider: 'DJI',
    externalDeviceId: 'dji-fleet-201',
    connectorStatus: 'ONLINE',
  },
  {
    droneCode: 'DRN-OPS-202',
    model: 'Autel EVO Max 4T',
    manufacturer: 'Autel',
    serialNumber: 'AUTEL-OPS-202',
    batteryType: 'High-Density LiPo',
    firmwareVersion: '2.8.14',
    status: 'IN_MISSION',
    flightHours: 91.2,
    certificationStatus: 'CERTIFIED',
    telemetryProvider: 'AUTEL',
    externalDeviceId: 'autel-fleet-202',
    connectorStatus: 'ONLINE',
  },
  {
    droneCode: 'DRN-OPS-203',
    model: 'DJI Mavic 3 Enterprise',
    manufacturer: 'DJI',
    serialNumber: 'DJI-OPS-203',
    batteryType: 'Intelligent Flight Battery',
    firmwareVersion: '6.2.0',
    status: 'IN_MISSION',
    flightHours: 58.8,
    certificationStatus: 'CERTIFIED',
    telemetryProvider: 'DJI',
    externalDeviceId: 'dji-fleet-203',
    connectorStatus: 'ONLINE',
  },
];

const missionSeed = [
  {
    missionCode: 'MIS-OPS-301',
    name: 'Harbour Infrastructure Survey',
    type: 'Inspection',
    status: 'ACTIVE',
    pilotEmail: 'ava.morgan+droneops@demo.local',
    droneCode: 'DRN-OPS-201',
    launchSite: 'Barangaroo Operations Deck',
    operatingArea: 'Sydney Harbour West',
    progress: 64,
    route: [
      [151.201, -33.8584],
      [151.2052, -33.8611],
      [151.2097, -33.8644],
      [151.2138, -33.8672],
    ],
  },
  {
    missionCode: 'MIS-OPS-302',
    name: 'Botanic Thermal Patrol',
    type: 'Safety Patrol',
    status: 'ACTIVE',
    pilotEmail: 'liam.chen+droneops@demo.local',
    droneCode: 'DRN-OPS-202',
    launchSite: 'Mrs Macquaries Point',
    operatingArea: 'Royal Botanic Garden',
    progress: 48,
    route: [
      [151.2147, -33.8674],
      [151.2186, -33.8698],
      [151.2221, -33.8718],
      [151.2255, -33.8733],
    ],
  },
  {
    missionCode: 'MIS-OPS-303',
    name: 'Coastal Compliance Recon',
    type: 'Compliance',
    status: 'ACTIVE',
    pilotEmail: 'noah.brooks+droneops@demo.local',
    droneCode: 'DRN-OPS-203',
    launchSite: 'Rose Bay Base',
    operatingArea: 'Rose Bay to Vaucluse',
    progress: 27,
    route: [
      [151.2715, -33.8688],
      [151.276, -33.8652],
      [151.2818, -33.8627],
      [151.2861, -33.8599],
    ],
  },
];

function routeToGeoJson(route) {
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: route,
    },
    properties: {},
  };
}

function telemetryTrail({ route, batteryStart, signalStart, altitudeBase, missionId, droneId }) {
  const now = Date.now();

 return route.map((point, index) => ({
    organisationId,
    droneId,
    missionId,
    latitude: point[1],
    longitude: point[0],
    altitude: altitudeBase + index * 6,
    speed: 9 + index * 1.3,
    heading: 35 + index * 18,
    batteryLevel: Math.max(18, batteryStart - index * 3),
    batteryVoltage: 24.2 - index * 0.12,
    signalStrength: Math.max(46, signalStart - index * 4),
    linkQuality: index > 2 ? 'FAIR' : 'GOOD',
    status: 'IN_FLIGHT',
    timestamp: new Date(now - (route.length - index) * 60 * 1000),
    rawPayload: {
      seeded: true,
      source: 'seedOrgOperationalData',
      waypointIndex: index,
    },
  }));
}

async function upsertUsers() {
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const users = {};

  for (const crewMember of crewSeed) {
    const user = await prisma.user.upsert({
      where: { email: crewMember.email },
      update: {
        name: crewMember.name,
        role: crewMember.role,
        organisationId,
        isVerified: true,
        passwordHash,
      },
      create: {
        organisationId,
        name: crewMember.name,
        email: crewMember.email,
        role: crewMember.role,
        isVerified: true,
        passwordHash,
      },
    });

    users[crewMember.email] = user;
  }

  return users;
}

async function upsertDrones() {
  const drones = {};

  for (const droneInput of droneSeed) {
    const drone = await prisma.drone.upsert({
      where: { serialNumber: droneInput.serialNumber },
      update: {
        ...droneInput,
        organisationId,
        lastTelemetryAt: new Date(),
        connectorConfig: {
          seeded: true,
          source: 'seedOrgOperationalData',
          providerHint: droneInput.telemetryProvider,
        },
      },
      create: {
        organisationId,
        ...droneInput,
        lastTelemetryAt: new Date(),
        connectorConfig: {
          seeded: true,
          source: 'seedOrgOperationalData',
          providerHint: droneInput.telemetryProvider,
        },
      },
    });

    drones[droneInput.droneCode] = drone;
  }

  return drones;
}

async function upsertMission(missionInput, users, drones) {
  const pilot = users[missionInput.pilotEmail];
  const drone = drones[missionInput.droneCode];

  const mission = await prisma.mission.upsert({
    where: {
      organisationId_missionCode: {
        organisationId,
        missionCode: missionInput.missionCode,
      },
    },
    update: {
      name: missionInput.name,
      type: missionInput.type,
      status: missionInput.status,
      pilotId: pilot.id,
      droneId: drone.id,
      plannedRoute: routeToGeoJson(missionInput.route),
      launchSite: missionInput.launchSite,
      operatingArea: missionInput.operatingArea,
      plannedStartAt: new Date(Date.now() - 45 * 60 * 1000),
      plannedEndAt: new Date(Date.now() + 70 * 60 * 1000),
      progress: missionInput.progress,
    },
    create: {
      organisationId,
      missionCode: missionInput.missionCode,
      name: missionInput.name,
      type: missionInput.type,
      status: missionInput.status,
      pilotId: pilot.id,
      droneId: drone.id,
      plannedRoute: routeToGeoJson(missionInput.route),
      launchSite: missionInput.launchSite,
      operatingArea: missionInput.operatingArea,
      plannedStartAt: new Date(Date.now() - 45 * 60 * 1000),
      plannedEndAt: new Date(Date.now() + 70 * 60 * 1000),
      progress: missionInput.progress,
    },
  });

  await prisma.riskAssessment.upsert({
    where: { missionId: mission.id },
    update: {
      organisationId,
      level: missionInput.progress > 50 ? 'MEDIUM' : 'LOW',
      hazards: [
        { category: 'Weather', risk: 'Wind shear near harbour edge' },
        { category: 'Airspace', risk: 'Nearby low-altitude helicopter corridor' },
      ],
      mitigations: [
        { action: 'Monitor wind and hold below safe gust threshold' },
        { action: 'Maintain approved route and live visual observer contact' },
      ],
    },
    create: {
      organisationId,
      missionId: mission.id,
      level: missionInput.progress > 50 ? 'MEDIUM' : 'LOW',
      hazards: [
        { category: 'Weather', risk: 'Wind shear near harbour edge' },
        { category: 'Airspace', risk: 'Nearby low-altitude helicopter corridor' },
      ],
      mitigations: [
        { action: 'Monitor wind and hold below safe gust threshold' },
        { action: 'Maintain approved route and live visual observer contact' },
      ],
    },
  });

  return mission;
}

async function replaceTelemetryForMission(missionInput, mission, drones) {
  const drone = drones[missionInput.droneCode];

  await prisma.telemetryLog.deleteMany({
    where: {
      organisationId,
      droneId: drone.id,
      missionId: mission.id,
    },
  });

  const batteries = {
    'MIS-OPS-301': 86,
    'MIS-OPS-302': 79,
    'MIS-OPS-303': 91,
  };

  const signals = {
    'MIS-OPS-301': 88,
    'MIS-OPS-302': 83,
    'MIS-OPS-303': 94,
  };

  const altitudeBase = {
    'MIS-OPS-301': 82,
    'MIS-OPS-302': 64,
    'MIS-OPS-303': 98,
  };

  await prisma.telemetryLog.createMany({
    data: telemetryTrail({
      route: missionInput.route,
      batteryStart: batteries[missionInput.missionCode],
      signalStart: signals[missionInput.missionCode],
      altitudeBase: altitudeBase[missionInput.missionCode],
      missionId: mission.id,
      droneId: drone.id,
    }),
  });

  const latest = missionInput.route[missionInput.route.length - 1];

  await prisma.drone.update({
    where: { id: drone.id },
    data: {
      status: 'IN_MISSION',
      connectorStatus: 'ONLINE',
      lastTelemetryAt: new Date(),
      telemetryLogs: {
        create: {
          organisationId,
          missionId: mission.id,
          latitude: latest[1],
          longitude: latest[0],
          altitude: altitudeBase[missionInput.missionCode] + 18,
          speed: 11.4,
          heading: 112,
          batteryLevel: Math.max(18, batteries[missionInput.missionCode] - 10),
          batteryVoltage: 23.6,
          signalStrength: Math.max(40, signals[missionInput.missionCode] - 9),
          linkQuality: 'GOOD',
          status: 'IN_FLIGHT',
          timestamp: new Date(),
          rawPayload: {
            seeded: true,
            source: 'seedOrgOperationalData',
            livePoint: true,
          },
        },
      },
    },
  });
}

async function main() {
  const organisation = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { id: true, name: true },
  });

  if (!organisation) {
    throw new Error(`Organisation not found: ${organisationId}`);
  }

  const users = await upsertUsers();
  const drones = await upsertDrones();

  const missionSummaries = [];

  for (const missionInput of missionSeed) {
    const mission = await upsertMission(missionInput, users, drones);
    await replaceTelemetryForMission(missionInput, mission, drones);

    missionSummaries.push({
      missionCode: mission.missionCode,
      missionName: mission.name,
      pilot: users[missionInput.pilotEmail].name,
      drone: missionInput.droneCode,
      status: mission.status,
    });
  }

  console.log(
    JSON.stringify(
      {
        organisation,
        usersSeeded: Object.values(users).map((user) => ({
          name: user.name,
          email: user.email,
          role: user.role,
        })),
        dronesSeeded: Object.values(drones).map((drone) => ({
          droneCode: drone.droneCode,
          model: drone.model,
          status: drone.status,
        })),
        missionsAssigned: missionSummaries,
      },
      null,
      2,
    ),
  );
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
