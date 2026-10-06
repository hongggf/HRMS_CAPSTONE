import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const permissions = [
    { action: 'PROMOTION_CREATE' },
    { action: 'PROMOTION_READ' },
    { action: 'PROMOTION_UPDATE' },
    { action: 'PROMOTION_APPROVE' },
    { action: 'PIP_CREATE' },
    { action: 'PIP_READ' },
    { action: 'PIP_UPDATE' }
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

  const hrPromotion = await prisma.role.upsert({
    where: { name: 'HR_PROMOTION' },
    update: {},
    create: {
      name: 'HR_PROMOTION',
      permissions: {
        create: allPerms.filter(p => p.action !== 'PROMOTION_APPROVE').map(p => ({ permission: { connect: { id: p.id } } }))
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

  console.log('Phase 9 permissions and role HR_PROMOTION seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
