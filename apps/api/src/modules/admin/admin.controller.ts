import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@ApiTags("Administration")
@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("settings")
  @ApiOperation({ summary: "Get system configuration settings" })
  @ApiResponse({ status: 200, description: "System settings" })
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Get("sessions")
  @ApiOperation({ summary: "Get all academic sessions" })
  @ApiResponse({ status: 200, description: "Academic sessions list" })
  async getSessions() {
    return this.adminService.getAcademicSessions();
  }

  @Get("tree")
  @ApiOperation({ summary: "Get complete organization tree (faculties, departments, programmes)" })
  @ApiResponse({ status: 200, description: "Organization hierarchy" })
  async getTree() {
    return this.adminService.getOrganizationTree();
  }

  @Get("audit-logs")
  @ApiOperation({ summary: "Get recent audit logs" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Recent audit logs" })
  async getAuditLogs(@Query("limit") limit?: number) {
    return this.adminService.getAuditLogs(limit ? Number(limit) : 50);
  }
}

