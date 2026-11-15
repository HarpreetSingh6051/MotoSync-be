import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
const logger = new Logger("HTTP");
export function requestLogging(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const started = Date.now();
  const id = randomUUID();
  res.locals.requestId = id;
  res.setHeader("X-Request-Id", id);
  res.on("finish", () => {
    const line = JSON.stringify({
      requestId: id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - started,
    });
    if (res.statusCode >= 500) logger.error(line);
    else if (res.statusCode >= 400) logger.warn(line);
    else logger.log(line);
  });
  next();
}
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: any, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    // Log diagnostics without request bodies, passwords, tokens, or database payloads.
    logger.error(
      JSON.stringify({
        requestId: response.locals.requestId,
        errorType: error?.constructor?.name,
        code: error?.code,
        status,
        ...(error instanceof HttpException ? { message: error.message } : {}),
        ...(error instanceof HttpException
          ? {}
          : {
              stack:
                error instanceof Error
                  ? error.stack?.split("\n").slice(1, 4).join("\n")
                  : undefined,
            }),
      }),
    );
    const payload =
      error instanceof HttpException
        ? error.getResponse()
        : {
            message:
              "Database or server operation failed. Check backend logs using the request ID.",
          };
    response.status(status).json({
      ...(typeof payload === "string" ? { message: payload } : payload),
      statusCode: status,
      requestId: response.locals.requestId,
    });
  }
}
