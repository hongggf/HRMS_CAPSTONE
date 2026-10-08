import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with User Role Matrix...');

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

  const roles = [];
  for (const roleName of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    roles.push(role);
  }
  console.log(`Created ${roles.length} roles.`);

  // 2. All Permissions from Matrix
  const permissionsData = [
    'ATTENDANCE_CREATE', 'ATTENDANCE_UPDATE',
    'DEPARTMENT_CREATE', 'DEPARTMENT_READ', 'DEPARTMENT_UPDATE',
    'DOCUMENT_UPLOAD',
    'EMPLOYEE_ACTIVATE', 'EMPLOYEE_CREATE', 'EMPLOYEE_READ', 'EMPLOYEE_UPDATE',
    'LEAVE_CREATE', 'LEAVE_UPDATE',
    'LND_CREATE', 'LND_READ', 'LND_UPDATE',
    'OVERTIME_CREATE', 'OVERTIME_UPDATE',
    'PAYROLL_CREATE', 'PAYROLL_LOCK', 'PAYROLL_READ', 'PAYROLL_APPROVE',
    'PERFORMANCE_APPROVE', 'PERFORMANCE_CREATE', 'PERFORMANCE_UPDATE',
    'PIP_CREATE', 'PIP_UPDATE',
    'POSITION_CREATE', 'POSITION_READ', 'POSITION_UPDATE',
    'PROMOTION_APPROVE', 'PROMOTION_CREATE', 'PROMOTION_READ',
    'RECRUITMENT_CREATE', 'RECRUITMENT_READ', 'RECRUITMENT_UPDATE',
    'SHIFT_CREATE', 'TIMESHEET_READ',
    'USER_CREATE', 'USER_READ', 'USER_ROLE_ASSIGN',
    'WORKFORCE_CREATE', 'WORKFORCE_READ', 'WORKFORCE_APPROVE'
  ];

  const permissions = [];
  for (const perm of permissionsData) {
    const permission = await prisma.permission.upsert({
      where: { action: perm },
      update: {},
      create: { action: perm },
    });
    permissions.push(permission);
  }
  console.log(`Created ${permissions.length} permissions.`);

  // Matrix mappings
  const rolePermissionsMap: Record<string, string[]> = {
    'HEAD_OF_HR': permissionsData, // ✅ All permissions
    'HR_RECRUITMENT': [
      'WORKFORCE_CREATE', 'WORKFORCE_READ', 
      'RECRUITMENT_CREATE', 'RECRUITMENT_READ', 'RECRUITMENT_UPDATE',
      'EMPLOYEE_READ', 'DEPARTMENT_READ', 'POSITION_READ'
    ],
    'HR_ADMIN': [
      'WORKFORCE_READ', 'RECRUITMENT_READ',
      'EMPLOYEE_CREATE', 'EMPLOYEE_READ', 'EMPLOYEE_UPDATE', 'EMPLOYEE_ACTIVATE', 'DOCUMENT_UPLOAD',
      'DEPARTMENT_CREATE', 'DEPARTMENT_READ', 'DEPARTMENT_UPDATE',
      'POSITION_CREATE', 'POSITION_READ', 'POSITION_UPDATE',
      'PROMOTION_CREATE', 'PROMOTION_READ',
      'USER_READ'
    ],
    'HR_ATTENDANCE': [
      'EMPLOYEE_READ', 'DEPARTMENT_READ', 'POSITION_READ', 'WORKFORCE_READ',
      'ATTENDANCE_CREATE', 'ATTENDANCE_UPDATE', 'SHIFT_CREATE', 'TIMESHEET_READ',
      'LEAVE_CREATE', 'LEAVE_UPDATE',
      'OVERTIME_CREATE', 'OVERTIME_UPDATE'
    ],
    'HR_PAYROLL': [
      'EMPLOYEE_READ', 'DEPARTMENT_READ', 'POSITION_READ', 'WORKFORCE_READ',
      'TIMESHEET_READ', 'PROMOTION_READ',
      'PAYROLL_CREATE', 'PAYROLL_READ', 'PAYROLL_LOCK'
    ],
    'HR_PERFORMANCE': [
      'EMPLOYEE_READ', 'DEPARTMENT_READ', 'POSITION_READ', 'WORKFORCE_READ',
      'PERFORMANCE_CREATE', 'PERFORMANCE_UPDATE', 'PERFORMANCE_APPROVE',
      'PROMOTION_CREATE', 'PROMOTION_READ',
      'PIP_CREATE', 'PIP_UPDATE',
      'LND_READ'
    ],
    'HR_LND': [
      'EMPLOYEE_READ', 'DEPARTMENT_READ', 'POSITION_READ', 'WORKFORCE_READ',
      'LND_CREATE', 'LND_READ', 'LND_UPDATE'
    ]
  };

  for (const roleName of rolesData) {
    const role = roles.find(r => r.name === roleName);
    if (!role) continue;
    
    const assignedPerms = rolePermissionsMap[roleName] || [];
    for (const permAction of assignedPerms) {
      const perm = permissions.find(p => p.action === permAction);
      if (perm) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
          update: {}, create: { roleId: role.id, permissionId: perm.id },
        });
      }
    }
    console.log(`Assigned ${assignedPerms.length} permissions to ${roleName}`);
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
    
    const headOfHrRole = roles.find((r) => r.name === 'HEAD_OF_HR');
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
