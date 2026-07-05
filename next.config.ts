import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { join } from "path";
import * as yaml from "js-yaml";

let appFullName = "attonews";
try {
  const configPath = join(process.cwd(), "config.yaml");
  const configContent = readFileSync(configPath, "utf-8");
  const parsedConfig = yaml.load(configContent) as {
    app?: { fullName?: string };
  };
  if (parsedConfig?.app?.fullName) {
    appFullName = parsedConfig.app.fullName;
  }
} catch {}

const nextConfig: NextConfig = {
  env: {
    APP_FULL_NAME: appFullName
  }
};

export default nextConfig;
