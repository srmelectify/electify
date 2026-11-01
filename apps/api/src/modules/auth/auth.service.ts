import { Injectable, UnauthorizedException, Inject } from "@nestjs/common";
import { DRIZZLE_DB } from "../database/database.module";
import { users } from "@electify/db";
import { eq, or } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { LoginDto } from "./dto/login.dto";

export interface UserSessionPayload {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId?: string | null;
  sectionId?: string | null;
}

@Injectable()
export class AuthService {
  private readonly jwtSecret: Uint8Array;

  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {
    const secret =
      process.env.JWT_SECRET ||
      "fallback-secret-key-at-least-32-chars-long-for-jwt-signing";
    this.jwtSecret = new TextEncoder().encode(secret);
  }

  async validateUser(identifier: string, pass: string): Promise<any> {
    const cleanId = identifier.trim().toLowerCase();

    // Query user by email or register number
    const [user] = await this.db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, cleanId),
          eq(users.registerNumber, identifier.trim().toUpperCase())
        )
      )
      .limit(1);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isValidPassword = await bcrypt.compare(pass, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      sectionId: user.sectionId,
      registerNumber: user.registerNumber,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.identifier, loginDto.password);

    const payload: UserSessionPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      sectionId: user.sectionId,
    };

    const token = await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("8h")
      .sign(this.jwtSecret);

    return {
      access_token: token,
      user,
    };
  }

  async verifyToken(token: string): Promise<UserSessionPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.jwtSecret);
      return payload as unknown as UserSessionPayload;
    } catch {
      return null;
    }
  }
}

