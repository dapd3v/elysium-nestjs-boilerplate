import { PrismaClient } from "@prisma/client";

export async function seedRole( prisma:PrismaClient, permissions:any ) {
  const adminRole = await prisma.role.create({
    data: {
      name: 'admin',
      description: 'Rol de administrador con todos los permisos',
      permissions: {
        connect: permissions.map(permission => ({ id: permission.id })),
      },
    },
  });

  return {
    adminRole
  }
}