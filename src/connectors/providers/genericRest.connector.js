import { env } from "../../config/env.js";

export const genericRestConnector = {
  provider: "GENERIC_REST",

  async readLatestTelemetry(drone) {
    const endpoint = drone.connectorConfig?.telemetryUrl;
    if (!endpoint) {
      throw new Error("Generic REST connector requires connectorConfig.telemetryUrl");
    }

    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        ...(env.genericTelemetryApiKey ? { Authorization: `Bearer ${env.genericTelemetryApiKey}` } : {})
      }
    });

    const vendorPayload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(vendorPayload.message || `Vendor telemetry request failed: ${response.status}`);
    }

    return normalizeGenericPayload(drone, vendorPayload);
  }
};

const normalizeGenericPayload = (drone, payload) => ({
  drone_id: drone.droneCode,
  mission_id: payload.mission_id ?? payload.missionId,
  timestamp: payload.timestamp ?? new Date().toISOString(),
  location: {
    latitude: Number(payload.location?.latitude ?? payload.latitude),
    longitude: Number(payload.location?.longitude ?? payload.longitude),
    altitude: Number(payload.location?.altitude ?? payload.altitude ?? 0)
  },
  velocity: {
    speed: Number(payload.velocity?.speed ?? payload.speed ?? 0),
    heading: Number(payload.velocity?.heading ?? payload.heading ?? 0)
  },
  battery: {
    level: Number(payload.battery?.level ?? payload.batteryLevel ?? 0),
    voltage: payload.battery?.voltage ?? payload.batteryVoltage
  },
  signal: {
    strength: Number(payload.signal?.strength ?? payload.signalStrength ?? 0),
    link_quality: payload.signal?.link_quality ?? payload.signal?.linkQuality ?? payload.linkQuality ?? "UNKNOWN"
  },
  status: payload.status ?? "IN_FLIGHT"
});
