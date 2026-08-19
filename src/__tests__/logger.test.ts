import { describe, it, expect, spyOn } from "bun:test";
import { Elysia } from "elysia";
import { Logger, logger, formatTimestamp } from "../utils/logger";
import { loggerPlugin } from "../plugins/logger.plugin";

describe("Logger Utility", () => {
  it("should format timestamp properly", () => {
    const formatted = formatTimestamp(new Date("2026-08-19T10:30:00.123Z"));
    expect(formatted).toBeDefined();
    expect(formatted.length).toBeGreaterThan(15);
  });

  it("should support log level filtering", () => {
    const customLogger = new Logger("warn");
    expect(customLogger.getLevel()).toBe("warn");
    expect(customLogger.shouldLog("debug")).toBe(false);
    expect(customLogger.shouldLog("info")).toBe(false);
    expect(customLogger.shouldLog("warn")).toBe(true);
    expect(customLogger.shouldLog("error")).toBe(true);

    customLogger.setLevel("debug");
    expect(customLogger.shouldLog("debug")).toBe(true);
    expect(customLogger.shouldLog("info")).toBe(true);
  });

  it("should invoke console methods on logger calls", () => {
    const customLogger = new Logger("debug");
    const debugSpy = spyOn(console, "debug");
    const infoSpy = spyOn(console, "info");
    const warnSpy = spyOn(console, "warn");
    const errorSpy = spyOn(console, "error");
    const logSpy = spyOn(console, "log");

    customLogger.debug("debug message");
    expect(debugSpy).toHaveBeenCalled();

    customLogger.info("info message");
    expect(infoSpy).toHaveBeenCalled();

    customLogger.warn("warn message");
    expect(warnSpy).toHaveBeenCalled();

    customLogger.error("error message");
    expect(errorSpy).toHaveBeenCalled();

    customLogger.http("http message");
    expect(logSpy).toHaveBeenCalled();

    debugSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });
});

describe("Logger Plugin", () => {
  it("should log requests and responses on Elysia app", async () => {
    const app = new Elysia()
      .use(loggerPlugin)
      .get("/api/test-success", () => ({ success: true }))
      .get("/api/test-warn", ({ set }) => {
        set.status = 404;
        return { error: "Not found" };
      })
      .get("/api/test-error", () => {
        throw new Error("Test server error");
      });

    const res1 = await app.handle(new Request("http://localhost/api/test-success"));
    expect(res1.status).toBe(200);

    const res2 = await app.handle(new Request("http://localhost/api/test-warn"));
    expect(res2.status).toBe(404);

    const res3 = await app.handle(new Request("http://localhost/api/test-error"));
    expect(res3.status).toBe(500);
  });
});
