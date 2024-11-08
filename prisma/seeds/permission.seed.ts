import { PrismaClient } from "@prisma/client";

export async function seedPermission( prisma:PrismaClient ) {
  const permissions = await Promise.all([
    prisma.permission.create({
      data: {
        name: 'users:read',
        description: 'Permite ver usuarios',
      },
    }),
    prisma.permission.create({
      data: {
        name: 'users:write',
        description: 'Permite crear/editar usuarios',
      },
    }),
    prisma.permission.create({
      data: {
        name: 'users:delete',
        description: 'Permite eliminar usuarios',
      },
    }),
    // Añade más permisos según necesites
  ]);
  
  return permissions
}