import * as dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env", "../../.env.local", "../../.env"] });

import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

export async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const port = process.env.NESTJS_PORT || process.env.API_PORT || 4000;

  const app = await NestFactory.create(AppModule);

  const httpAdapter = app.getHttpAdapter().getInstance();
  httpAdapter.get("/", (_req: any, res: any) => {
    res.redirect("/api/docs");
  });

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  const config = new DocumentBuilder()
    .setTitle("Electify API")
    .setDescription("Transactional Elective Registration System - NestJS REST API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  if (!process.env.VERCEL) {
    await app.listen(port);
    logger.log(`🚀 Electify NestJS Backend running at: http://localhost:${port}/api`);
    logger.log(`📖 Swagger API Documentation available at: http://localhost:${port}/api/docs`);
  }

  return app;
}

if (!process.env.VERCEL) {
  bootstrap();
}
