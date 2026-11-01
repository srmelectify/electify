import { Controller, Get, Param, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { StudentsService } from "./students.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@ApiTags("Students")
@Controller("students")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get("me/profile")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current student profile" })
  @ApiResponse({ status: 200, description: "Student profile" })
  async getMyProfile(@Request() req: any) {
    return this.studentsService.getProfile(req.user.id);
  }

  @Get("me/registrations")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current student elective registrations" })
  @ApiResponse({ status: 200, description: "List of student registrations" })
  async getMyRegistrations(@Request() req: any) {
    return this.studentsService.getRegistrations(req.user.id);
  }

  @Get(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("TUTOR", "COORDINATOR", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get student profile by ID (Faculty/Staff only)" })
  @ApiResponse({ status: 200, description: "Student profile" })
  @ApiResponse({ status: 404, description: "Student not found" })
  async getStudentById(@Param("id") id: string) {
    return this.studentsService.getProfile(id);
  }

  @Get(":id/registrations")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("TUTOR", "COORDINATOR", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get registrations for specific student (Faculty/Staff only)" })
  @ApiResponse({ status: 200, description: "Student registrations" })
  async getStudentRegistrations(@Param("id") id: string) {
    return this.studentsService.getRegistrations(id);
  }
}

