export const djiConnector = {
  provider: "DJI",

  async readLatestTelemetry() {
    throw new Error("DJI connector requires DJI Cloud API or DJI SDK credentials before production use");
  }
};
