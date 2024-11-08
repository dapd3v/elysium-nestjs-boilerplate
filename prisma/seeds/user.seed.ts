// user seeds.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const roundsOfHashing = 10;

export async function seedUsers(prisma: PrismaClient, role:any) {

  const hashedPassword = await bcrypt.hash('admin123', roundsOfHashing);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin',
      lastName: 'System',
      password: hashedPassword,
      emailVerified: new Date(),
      roles: {
        connect: {
          id: role.adminRole.id,
        },
      },
    },
  });

  console.log('User seeded successfully.');
}