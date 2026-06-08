export const mavlinkConnector = {
  provider: "MAVLINK",

  async readLatestTelemetry() {
    throw new Error("MAVLink connector requires a MAVLink bridge service before production use");
  }
};
