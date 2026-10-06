import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const permissions = [
    { action: 'ATTENDANCE_CREATE' },
    { action: 'ATTENDANCE_READ' },
    { action: 'ATTENDANCE_UPDATE' },
    { action: 'LEAVE_CREATE' },
    { action: 'LEAVE_READ' },
    { action: 'LEAVE_UPDATE' },
    { action: 'OVERTIME_CREATE' },
    { action: 'OVERTIME_READ' },
    { action: 'OVERTIME_UPDATE' },
    { action: 'TIMESHEET_READ' },
    { action: 'SHIFT_CREATE' },
    { action: 'SHIFT_READ' },
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

  const hrAttendance = await prisma.role.upsert({
    where: { name: 'HR_ATTENDANCE' },
    update: {},
    create: {
      name: 'HR_ATTENDANCE',
      permissions: {
        create: allPerms.map(p => ({ permission: { connect: { id: p.id } } }))
      }
    }
  });

  console.log('Phase 6 permissions and role HR_ATTENDANCE seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
