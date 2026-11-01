import { Global, Module, OnModuleInit, Logger } from "@nestjs/common";
import { db, pool, ensureDatabaseReady } from "@electify/db";

export const DRIZZLE_DB = "DRIZZLE_DB";
export const DB_POOL = "DB_POOL";

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_DB,
      useValue: db,
    },
    {
      provide: DB_POOL,
      useValue: pool,
    },
  ],
  exports: [DRIZZLE_DB, DB_POOL],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  async onModuleInit() {
    try {
      await ensureDatabaseReady();
      this.logger.log("Database connection & auto-heal verification complete");
    } catch (err) {
      this.logger.warn(`Non-fatal database auto-heal warning: ${err}`);
    }
  }
}
