import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("Authentication token missing");
    }

    const payload = await this.authService.verifyToken(token);
    if (!payload) {
      throw new UnauthorizedException("Invalid or expired session token");
    }

    request.user = payload;
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers.authorization;
    if (authHeader && typeof authHeader === "string") {
      const [type, token] = authHeader.split(" ");
      if (type === "Bearer" && token) {
        return token;
      }
    }

    // Also support cookies if available
    if (request.cookies && request.cookies.electify_session) {
      return request.cookies.electify_session;
    }

    return undefined;
  }
}

