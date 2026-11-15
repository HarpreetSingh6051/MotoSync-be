import {
  All,
  Controller,
  Param,
  Req,
  Res,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request, Response } from "express";

/** Narrow Auth gateway: the upstream host and API key are server configuration. */
@Controller("auth/v1")
export class AuthController {
  constructor(private readonly config: ConfigService) {}
  @All(":action")
  async forward(
    @Param("action") action: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const methods: Record<string, string[]> = {
      token: ["POST"],
      user: ["GET", "PUT"],
      logout: ["POST"],
    };
    if (!methods[action]?.includes(req.method))
      return res.status(404).json({ message: "Unsupported auth operation" });
    const base = this.config.get<string>("SUPABASE_URL");
    const key = this.config.get<string>("SUPABASE_ANON_KEY");
    if (!base || !key)
      throw new ServiceUnavailableException(
        "Backend Supabase Auth is not configured",
      );
    const target = new URL(`${base.replace(/\/$/, "")}/auth/v1/${action}`);
    for (const name of ["grant_type", "scope"])
      if (typeof req.query[name] === "string")
        target.searchParams.set(name, req.query[name] as string);
    try {
      const upstream = await fetch(target, {
        method: req.method,
        headers: {
          apikey: key,
          "Content-Type": "application/json",
          ...(req.headers.authorization
            ? { Authorization: req.headers.authorization }
            : {}),
        },
        body: req.method === "GET" ? undefined : JSON.stringify(req.body || {}),
        signal: AbortSignal.timeout(15000),
      });
      res.setHeader("Cache-Control", "no-store");
      const text = await upstream.text();
      return res.status(upstream.status).type("application/json").send(text);
    } catch {
      throw new ServiceUnavailableException(
        "Cannot reach authentication provider. Retry shortly",
      );
    }
  }
}
