import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

export default async () => {
  dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });
  console.log('Resetting test database...');
  execSync('npx prisma db push --force-reset', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL } });

  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } }
  });

  console.log('Seeding roles and permissions...');
  const roles = [
    'HEAD_OF_HR',
    'HR_RECRUITMENT',
    'HR_ADMIN',
    'HR_ATTENDANCE',
    'HR_PAYROLL',
    'HR_PERFORMANCE',
    'HR_LND',
    'EMPLOYEE'
  ];

  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  // permissions if any test requires it specifically
  const permRead = await prisma.permission.upsert({
    where: { action: 'USER_READ' },
    update: {},
    create: { action: 'USER_READ'}
  });
  const headRole = await prisma.role.findUnique({ where: { name: 'HEAD_OF_HR' }});
  if (headRole) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: headRole.id, permissionId: permRead.id } },
      update: {},
      create: { roleId: headRole.id, permissionId: permRead.id }
    });
  }

  await prisma.$disconnect();
  console.log('Global setup complete.');
};
