import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./modules/database/database.module";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ElectivesModule } from "./modules/electives/electives.module";
import { StudentsModule } from "./modules/students/students.module";
import { FacultyModule } from "./modules/faculty/faculty.module";
import { AdminModule } from "./modules/admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env.local", "../../.env", ".env.local", ".env"],
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    ElectivesModule,
    StudentsModule,
    FacultyModule,
    AdminModule,
  ],
})
export class AppModule {}

