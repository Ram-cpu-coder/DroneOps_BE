export const autelConnector = {
  provider: "AUTEL",

  async readLatestTelemetry() {
    throw new Error("Autel connector requires Autel SDK/API credentials before production use");
  }
};
