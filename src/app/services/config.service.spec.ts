import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { ConfigService } from "./config.service";
import * as fsPromises from "fs/promises";
import * as yaml from "js-yaml";

describe("ConfigService", () => {
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService();
  });

  afterEach(() => {
    mock.reset();
  });

  describe("loadConfig", () => {
    it("should load config from yaml file", async () => {
      const mockConfig = {
        app: {
          name: "TestRoom",
          fullName: "Test attonews"
        }
      };

      mock.method(fsPromises, "readFile", async () => "yaml content");
      mock.method(yaml, "load", () => mockConfig);

      const config = await configService.loadConfig();

      assert.strictEqual(config.app.name, "TestRoom");
      assert.strictEqual(config.app.fullName, "Test attonews");
    });

    it("should apply environment variable overrides", async () => {
      const mockConfig = {
        app: {
          name: "Newsroom",
          fullName: "attonews"
        }
      };

      process.env.APP_NAME = "CustomName";
      process.env.APP_FULL_NAME = "Custom Full Name";

      mock.method(fsPromises, "readFile", async () => "yaml content");
      mock.method(yaml, "load", () => mockConfig);

      const config = await configService.loadConfig();

      assert.strictEqual(config.app.name, "CustomName");
      assert.strictEqual(config.app.fullName, "Custom Full Name");

      delete process.env.APP_NAME;
      delete process.env.APP_FULL_NAME;
    });

    it("should return default config when file read fails", async () => {
      mock.method(fsPromises, "readFile", async () => {
        throw new Error("File not found");
      });

      const config = await configService.loadConfig();

      assert.strictEqual(config.app.name, "Newsroom");
      assert.strictEqual(config.app.fullName, "attonews");
    });
  });

  describe("getAppName", () => {
    it("should return app name", async () => {
      const mockConfig = {
        app: {
          name: "TestName",
          fullName: "Test Full Name"
        }
      };

      mock.method(fsPromises, "readFile", async () => "yaml content");
      mock.method(yaml, "load", () => mockConfig);

      const name = await configService.getAppName();

      assert.strictEqual(name, "TestName");
    });
  });

  describe("getAppFullName", () => {
    it("should return app full name", async () => {
      const mockConfig = {
        app: {
          name: "TestName",
          fullName: "Test Full Name"
        }
      };

      mock.method(fsPromises, "readFile", async () => "yaml content");
      mock.method(yaml, "load", () => mockConfig);

      const fullName = await configService.getAppFullName();

      assert.strictEqual(fullName, "Test Full Name");
    });
  });
});
