import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ExpressAdapter } from "@nestjs/platform-express";
import express from "express";
import { AppModule } from "./app.module";

const server = express();

export async function createNestServer(expressInstance: express.Express) {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance)
  );

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

  await app.init();
  return app;
}

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const port = process.env.PORT || process.env.NESTJS_PORT || 4000;

  const app = await createNestServer(server);

  // If not running inside Vercel serverless execution, listen on HTTP port
  if (!process.env.VERCEL) {
    await app.listen(port);
    logger.log(`🚀 Electify NestJS Backend running at: http://localhost:${port}/api`);
    logger.log(`📖 Swagger API Documentation available at: http://localhost:${port}/api/docs`);
  }
}

// Bootstrap locally or when run directly
if (!process.env.VERCEL) {
  bootstrap();
}

export default server;

