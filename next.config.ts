import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { join } from "path";
import * as yaml from "js-yaml";

let appName = "Newsroom";
let appFullName = "attonews";
try {
  const configPath = join(process.cwd(), "config.yaml");
  const configContent = readFileSync(configPath, "utf-8");
  const parsedConfig = yaml.load(configContent) as {
    app?: { name?: string; fullName?: string };
  };
  if (parsedConfig?.app?.name) {
    appName = parsedConfig.app.name;
  }
  if (parsedConfig?.app?.fullName) {
    appFullName = parsedConfig.app.fullName;
  }
} catch {}

const nextConfig: NextConfig = {
  env: {
    APP_FULL_NAME: appFullName,
    NEXT_PUBLIC_APP_NAME: appName,
    NEXT_PUBLIC_APP_FULL_NAME: appFullName
  }
};

export default nextConfig;
