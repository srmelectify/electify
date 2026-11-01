import { Controller, Get, Inject } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { DB_POOL } from "../database/database.module";
import { Pool } from "pg";

@ApiTags("API Root")
@Controller()
export class RootController {
  @Get()
  @ApiOperation({ summary: "API Index & Service Overview" })
  @ApiResponse({ status: 200, description: "API root overview" })
  getRoot() {
    return {
      name: "Electify Backend REST API",
      status: "online",
      version: "0.1.0",
      documentation: "/api/docs",
      endpoints: {
        swagger: "/api/docs",
        health: "/api/health",
        healthDb: "/api/health/db",
        authLogin: "/api/auth/login",
        authMe: "/api/auth/me",
        electives: "/api/electives",
        electivesMetrics: "/api/electives/metrics/seats",
        studentsProfile: "/api/students/me/profile",
        facultySections: "/api/faculty/my-sections",
        adminSettings: "/api/admin/settings",
      },
    };
  }
}

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
