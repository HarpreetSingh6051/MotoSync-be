import { ConfigService } from "@nestjs/config";
import {
  requestLogging,
  ApiExceptionFilter,
} from "../src/common/http-observability";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { AppModule } from "../src/app.module";
import express, { Express, Request, Response } from "express";
import helmet from "helmet";
import compression from "compression";
import { ValidationPipe } from "@nestjs/common";

let cachedServer: Express;

async function bootstrapServer(): Promise<Express> {
  if (!cachedServer) {
    const expressApp = express();
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );
    const config = app.get(ConfigService);
    app.setGlobalPrefix(config.get("API_PREFIX") || "api/v1");
    app.use(requestLogging);
    app.useGlobalFilters(new ApiExceptionFilter());
    app.use(helmet());
    app.use(compression());
    app.enableCors({
      origin: (config.get<string>("CORS_ORIGIN") || "http://localhost:5174")
        .split(",")
        .map((value) => value.trim()),
      credentials: true,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    cachedServer = expressApp;
  }
  return cachedServer;
}

export default async function handler(req: Request, res: Response) {
  const server = await bootstrapServer();
  return server(req, res);
}
