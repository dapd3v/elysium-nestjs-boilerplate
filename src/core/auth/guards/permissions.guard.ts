import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;


    const userRoles = await this.prisma.role.findUnique({
      where: { id: user._pk }, // ID del rol
      include: { permissions: true }, // Incluir los permisos
    });

    // const permissions = userRoles.flatMap(userRole =>
    //   userRole.Role.RolePermission.map(rolePermission => rolePermission.Permission.name)
    // );

    // return requiredPermissions.every(permission => {
    //   const [module] = permission.split(':');
    //   return permissions.includes(permission) || permissions.includes(`${module}:manage`);
    // });
  }
}
