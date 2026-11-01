import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { ElectivesService } from "./electives.service";

@ApiTags("Electives")
@Controller("electives")
export class ElectivesController {
  constructor(private readonly electivesService: ElectivesService) {}

  @Get()
  @ApiOperation({ summary: "List electives, optionally filtered by group" })
  @ApiQuery({ name: "groupId", required: false, type: String })
  @ApiResponse({ status: 200, description: "List of electives" })
  async getElectives(@Query("groupId") groupId?: string) {
    return this.electivesService.findAll(groupId);
  }

  @Get("groups")
  @ApiOperation({ summary: "List elective groups, optionally filtered by event" })
  @ApiQuery({ name: "eventId", required: false, type: String })
  @ApiResponse({ status: 200, description: "List of elective groups" })
  async getGroups(@Query("eventId") eventId?: string) {
    return this.electivesService.findGroups(eventId);
  }

  @Get("metrics/seats")
  @ApiOperation({ summary: "Get aggregated seat availability metrics" })
  @ApiResponse({ status: 200, description: "Aggregate seat metrics" })
  async getSeatMetrics() {
    return this.electivesService.getSeatMetrics();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get elective details by ID" })
  @ApiResponse({ status: 200, description: "Elective details" })
  @ApiResponse({ status: 404, description: "Elective not found" })
  async getElectiveById(@Param("id") id: string) {
    return this.electivesService.findOne(id);
  }
}

