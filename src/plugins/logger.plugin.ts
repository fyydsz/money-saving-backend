import { Elysia } from "elysia";
import { logger, LOG_COLORS } from "../utils/logger";

const requestStartTimes = new WeakMap<Request, number>();

function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return LOG_COLORS.blue;
    case "POST":
      return LOG_COLORS.green;
    case "PUT":
    case "PATCH":
      return LOG_COLORS.yellow;
    case "DELETE":
      return LOG_COLORS.red;
    default:
      return LOG_COLORS.white;
  }
}

function getStatusColor(status: number): string {
  if (status >= 500) return LOG_COLORS.red;
  if (status >= 400) return LOG_COLORS.yellow;
  if (status >= 300) return LOG_COLORS.cyan;
  if (status >= 200) return LOG_COLORS.green;
  return LOG_COLORS.white;
}

export const loggerPlugin = new Elysia({ name: "loggerPlugin" })
  .onRequest(({ request }) => {
    // Ignore CORS preflight OPTIONS requests from standard logs
    if (request.method === "OPTIONS") {
      if (logger.shouldLog("debug")) {
        logger.debug(`[PREFLIGHT] OPTIONS ${new URL(request.url).pathname}`);
      }
      return;
    }

    requestStartTimes.set(request, performance.now());

    const url = new URL(request.url);
    const methodColor = getMethodColor(request.method);
    const method = `${methodColor}${LOG_COLORS.bold}${request.method.padEnd(6)}${LOG_COLORS.reset}`;
    
    logger.http(`--> ${method} ${url.pathname}${url.search}`);
  })
  .onAfterResponse(({ request, set }) => {
    if (request.method === "OPTIONS") {
      return;
    }

    const startTime = requestStartTimes.get(request);
    const duration = startTime ? (performance.now() - startTime).toFixed(2) : "0.00";
    const status = typeof set.status === "number" ? set.status : (set.status ? parseInt(String(set.status)) : 200);

    const url = new URL(request.url);
    const methodColor = getMethodColor(request.method);
    const method = `${methodColor}${LOG_COLORS.bold}${request.method.padEnd(6)}${LOG_COLORS.reset}`;
    const statusColor = getStatusColor(status);
    const statusFormatted = `${statusColor}${LOG_COLORS.bold}${status}${LOG_COLORS.reset}`;
    const durationFormatted = `${LOG_COLORS.gray}(${duration}ms)${LOG_COLORS.reset}`;

    const logMessage = `<-- ${method} ${url.pathname}${url.search} ${statusFormatted} ${durationFormatted}`;

    if (status >= 500) {
      logger.error(logMessage);
    } else if (status >= 400) {
      logger.warn(logMessage);
    } else {
      logger.http(logMessage);
    }
  })
  .onError(({ code, error, set, request }) => {
    const url = new URL(request.url);
    const methodColor = getMethodColor(request.method);
    const method = `${methodColor}${LOG_COLORS.bold}${request.method.padEnd(6)}${LOG_COLORS.reset}`;
    const status = typeof set.status === "number" ? set.status : (set.status ? parseInt(String(set.status)) : 500);

    const message = `[${code}] ${method} ${url.pathname}${url.search} - ${error.message}`;

    if (status >= 500 || code === "UNKNOWN" || code === "INTERNAL_SERVER_ERROR") {
      logger.error(message, error.stack ? `\n${error.stack}` : "");
    } else {
      logger.warn(message);
    }
  });
