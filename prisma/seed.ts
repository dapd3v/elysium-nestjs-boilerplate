import { PrismaClient } from '@prisma/client';
//Seeds
import { seedUsers } from './seeds/user.seed';
import { seedRole } from './seeds/roles.seed';
import { seedPermission } from './seeds/permission.seed';


// initialize the Prisma Client
const prisma = new PrismaClient();


async function main() {
  try {
    const permissions = await seedPermission(prisma)
    const role = await seedRole(prisma, permissions)
    await seedUsers(prisma, role);
    // Llama aquí a las funciones de semilla de otros archivos según sea necesario

    console.log('All seeds executed successfully.');
  } catch (error) {
    console.error('Error executing seeds:', error);
  }
}

// execute the main function
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // close the Prisma Client at the end
    await prisma.$disconnect();
  });