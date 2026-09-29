import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Roles
  const rolesData = [
    'HEAD_OF_HR',
    'HR_RECRUITMENT',
    'HR_ADMIN',
    'HR_ATTENDANCE',
    'HR_PAYROLL',
    'HR_PERFORMANCE',
    'HR_LND',
  ];

  const roles = await Promise.all(
    rolesData.map((roleName) =>
      prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      })
    )
  );
  console.log(`Created ${roles.length} roles.`);

  // 2. Permissions
  const permissionsData = [
    'USER_READ',
    'USER_CREATE',
    'USER_UPDATE',
    'USER_ROLE_ASSIGN',
    'WORKFORCE_CREATE',
    'WORKFORCE_APPROVE',
    'RECRUITMENT_CREATE',
    'PAYROLL_APPROVE',
  ];

  const permissions = await Promise.all(
    permissionsData.map((perm) =>
      prisma.permission.upsert({
        where: { action: perm },
        update: {},
        create: { action: perm },
      })
    )
  );
  console.log(`Created ${permissions.length} permissions.`);

  // 3. Assign all permissions to HEAD_OF_HR
  const headOfHrRole = roles.find((r) => r.name === 'HEAD_OF_HR');
  if (headOfHrRole) {
    await Promise.all(
      permissions.map((perm) =>
        prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: headOfHrRole.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: headOfHrRole.id,
            permissionId: perm.id,
          },
        })
      )
    );
  }

  // 4. Create HEAD_OF_HR user
  const email = process.env.SEED_EMAIL || 'head@hr.local';
  const passwordText = process.env.SEED_PASSWORD || 'password123';
  const password = await bcrypt.hash(passwordText, 10);

  let adminUser = await prisma.user.findUnique({ where: { email } });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email,
        password,
        isActive: true,
      },
    });
    
    if (headOfHrRole) {
      await prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: headOfHrRole.id,
        },
      });
    }
    console.log(`Created HEAD_OF_HR user: ${email}`);
  } else {
    console.log(`User ${email} already exists.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
