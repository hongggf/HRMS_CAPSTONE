import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const permissions = [
    { action: 'PERFORMANCE_CREATE' },
    { action: 'PERFORMANCE_READ' },
    { action: 'PERFORMANCE_UPDATE' },
    { action: 'PERFORMANCE_DELETE' },
    { action: 'PERFORMANCE_APPROVE' }
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

  const hrPerformance = await prisma.role.upsert({
    where: { name: 'HR_PERFORMANCE' },
    update: {},
    create: {
      name: 'HR_PERFORMANCE',
      permissions: {
        create: allPerms.filter(p => p.action !== 'PERFORMANCE_APPROVE').map(p => ({ permission: { connect: { id: p.id } } }))
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

  console.log('Phase 8 permissions and role HR_PERFORMANCE seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
