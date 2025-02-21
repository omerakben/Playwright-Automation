import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clean existing data
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@example.com',
      password: 'adminpass123', // In production, use hashed passwords
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  // Create test users
  const users = await Promise.all(
    Array(5)
      .fill(null)
      .map(() =>
        prisma.user.create({
          data: {
            username: faker.internet.userName(),
            email: faker.internet.email(),
            password: faker.internet.password(),
            role: 'user',
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
          },
        }),
      ),
  );

  // Create test projects
  const projects = await Promise.all(
    Array(10)
      .fill(null)
      .map(async () => {
        const owner = faker.helpers.arrayElement([admin, ...users]);
        const members = faker.helpers.arrayElements(users, { min: 1, max: 3 });

        return prisma.project.create({
          data: {
            name: faker.company.name(),
            description: faker.lorem.paragraph(),
            status: faker.helpers.arrayElement(['active', 'archived', 'draft']),
            startDate: faker.date.past(),
            endDate: faker.date.future(),
            ownerId: owner.id,
            members: {
              connect: members.map((member) => ({ id: member.id })),
            },
          },
        });
      }),
  );

  console.log('Database seed completed:');
  console.log(`- Created ${users.length + 1} users (including admin)`);
  console.log(`- Created ${projects.length} projects`);
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
