import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const userRoles = await this.prisma.user.findUnique({
      where: {
        id: user._pk, // ID del usuario
      },
      select: {
        roles: {
          select: {
            name: true, 
          },
        },
      },
    });

    if (!userRoles || userRoles.roles.length === 0) {
      return false; // Si el usuario no tiene roles, no se le permite acceso
    }

    const roles = userRoles.roles.map(role => role.name as Role);

    return requiredRoles.some(role => roles.includes(role));
  }
}
