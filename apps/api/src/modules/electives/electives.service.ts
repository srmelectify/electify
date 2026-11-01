import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { DRIZZLE_DB } from "../database/database.module";
import { electives, electiveGroups, registrationEvents } from "@electify/db";
import { eq, sql } from "drizzle-orm";

@Injectable()
export class ElectivesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async findAll(groupId?: string) {
    if (groupId) {
      return this.db
        .select()
        .from(electives)
        .where(eq(electives.groupId, groupId));
    }
    return this.db.select().from(electives);
  }

  async findOne(id: string) {
    const [elective] = await this.db
      .select()
      .from(electives)
      .where(eq(electives.id, id))
      .limit(1);

    if (!elective) {
      throw new NotFoundException(`Elective with ID ${id} not found`);
    }

    return elective;
  }

  async findGroups(eventId?: string) {
    if (eventId) {
      return this.db
        .select()
        .from(electiveGroups)
        .where(eq(electiveGroups.eventId, eventId));
    }
    return this.db.select().from(electiveGroups);
  }

  async getSeatMetrics() {
    const [stats] = await this.db
      .select({
        totalElectives: sql<number>`count(*)::int`,
        totalSeats: sql<number>`coalesce(sum(${electives.maxSeats}), 0)::int`,
        availableSeats: sql<number>`coalesce(sum(${electives.availableSeats}), 0)::int`,
        fullElectives: sql<number>`coalesce(sum(case when ${electives.isFull} then 1 else 0 end), 0)::int`,
      })
      .from(electives);

    return {
      totalElectives: stats?.totalElectives || 0,
      totalSeats: stats?.totalSeats || 0,
      availableSeats: stats?.availableSeats || 0,
      filledSeats: (stats?.totalSeats || 0) - (stats?.availableSeats || 0),
      fullElectives: stats?.fullElectives || 0,
    };
  }
}

