import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const permissions = [
    { action: 'PAYROLL_CREATE' },
    { action: 'PAYROLL_READ' },
    { action: 'PAYROLL_UPDATE' },
    { action: 'PAYROLL_DELETE' },
    { action: 'PAYROLL_APPROVE' },
    { action: 'PAYROLL_LOCK' },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { action: p.action },
      update: {},
      create: p,
    });
  }

  const allPerms = await prisma.permission.findMany({
    where: { action: { in: permissions.map(p => p.action) } }
  });

  const payrollOfficer = await prisma.role.upsert({
    where: { name: 'PAYROLL_OFFICER' },
    update: {},
    create: {
      name: 'PAYROLL_OFFICER',
      permissions: {
        create: allPerms.filter(p => !['PAYROLL_APPROVE', 'PAYROLL_LOCK'].includes(p.action)).map(p => ({ permission: { connect: { id: p.id } } }))
      }
    }
  });

  const headOfHr = await prisma.role.findUnique({ where: { name: 'HEAD_OF_HR' } });
  if (headOfHr) {
    for (const p of allPerms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: headOfHr.id, permissionId: p.id } },
        update: {},
        create: { roleId: headOfHr.id, permissionId: p.id }
      });
    }
  }

  console.log('Phase 7 permissions and role PAYROLL_OFFICER seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
