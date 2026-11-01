import { Controller, Get, Inject } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { DB_POOL } from "../database/database.constants";
import { Pool } from "pg";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  @Get()
  @ApiOperation({ summary: "Application health check" })
  @ApiResponse({ status: 200, description: "API service is running" })
  check() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: "electify-backend",
      version: "0.1.0",
    };
  }

  @Get("db")
  @ApiOperation({ summary: "Database connectivity check" })
  @ApiResponse({ status: 200, description: "Database is reachable" })
  async checkDb() {
    try {
      const res = await this.pool.query("SELECT 1 AS alive");
      return {
        status: "ok",
        database: "connected",
        ping: res.rows[0]?.alive === 1 ? "success" : "failed",
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: "error",
        database: "disconnected",
        error: err.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

