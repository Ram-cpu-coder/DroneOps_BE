import { autelConnector } from "./providers/autel.connector.js";
import { djiConnector } from "./providers/dji.connector.js";
import { genericRestConnector } from "./providers/genericRest.connector.js";
import { mavlinkConnector } from "./providers/mavlink.connector.js";

const connectors = {
  GENERIC_REST: genericRestConnector,
  DJI: djiConnector,
  AUTEL: autelConnector,
  MAVLINK: mavlinkConnector
};

export const getTelemetryConnector = (provider) => {
  return connectors[provider] ?? null;
};
