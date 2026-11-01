import { Controller, Get, Param, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { FacultyService } from "./faculty.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@ApiTags("Faculty & Staff")
@Controller("faculty")
@UseGuards(AuthGuard, RolesGuard)
@Roles("TUTOR", "COORDINATOR", "ADMIN")
@ApiBearerAuth()
export class FacultyController {
  constructor(private readonly facultyService: FacultyService) {}

  @Get("my-sections")
  @ApiOperation({ summary: "Get sections assigned to the logged-in tutor" })
  @ApiResponse({ status: 200, description: "List of assigned sections" })
  async getMySections(@Request() req: any) {
    return this.facultyService.getTutorSections(req.user.id);
  }

  @Get("sections")
  @ApiOperation({ summary: "Get all sections (Coordinator / Admin)" })
  @ApiResponse({ status: 200, description: "List of all sections" })
  async getAllSections() {
    return this.facultyService.getAllSections();
  }

  @Get("sections/:id/students")
  @ApiOperation({ summary: "Get all students enrolled in a specific section" })
  @ApiResponse({ status: 200, description: "List of section students" })
  async getSectionStudents(@Param("id") id: string) {
    return this.facultyService.getSectionStudents(id);
  }
}

