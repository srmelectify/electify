import { Request, Response } from "express";
import express from "express";
import { createNestServer } from "../src/main";

const server = express();
let isReady = false;

async function bootstrap() {
  if (!isReady) {
    await createNestServer(server);
    isReady = true;
  }
}

export default async function handler(req: Request, res: Response) {
  await bootstrap();
  server(req, res);
}

