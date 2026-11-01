import { Injectable, Inject } from "@nestjs/common";
import { DRIZZLE_DB } from "../database/database.module";
import {
  systemSettings,
  academicSessions,
  auditLogs,
  faculties,
  departments,
  programmes,
} from "@electify/db";
import { desc } from "drizzle-orm";

@Injectable()
export class AdminService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async getSettings() {
    const [settings] = await this.db.select().from(systemSettings).limit(1);
    return settings || null;
  }

  async getAcademicSessions() {
    return this.db
      .select()
      .from(academicSessions)
      .orderBy(desc(academicSessions.startYear));
  }

  async getAuditLogs(limit = 50) {
    return this.db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  async getOrganizationTree() {
    const [facList, deptList, progList] = await Promise.all([
      this.db.select().from(faculties),
      this.db.select().from(departments),
      this.db.select().from(programmes),
    ]);

    return {
      faculties: facList,
      departments: deptList,
      programmes: progList,
    };
  }
}

