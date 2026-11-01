import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";

const ROLE_ALIASES: Record<string, string[]> = {
  ADMIN: ["ADMIN", "SYSTEM_ADMIN"],
  SYSTEM_ADMIN: ["ADMIN", "SYSTEM_ADMIN"],
  TUTOR: ["TUTOR", "CLASS_TUTOR"],
  CLASS_TUTOR: ["TUTOR", "CLASS_TUTOR"],
  COORDINATOR: ["COORDINATOR", "COURSE_COORDINATOR"],
  COURSE_COORDINATOR: ["COORDINATOR", "COURSE_COORDINATOR"],
  STUDENT: ["STUDENT"],
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException("Access denied: user role not identified");
    }

    const userRole = user.role.toUpperCase();
    const hasRole = requiredRoles.some((reqRole) => {
      const allowed = ROLE_ALIASES[reqRole.toUpperCase()] || [reqRole.toUpperCase()];
      return allowed.includes(userRole);
    });

    if (!hasRole) {
      throw new ForbiddenException(
        `Requires one of the following roles: [${requiredRoles.join(", ")}]`
      );
    }

    return true;
  }
}
