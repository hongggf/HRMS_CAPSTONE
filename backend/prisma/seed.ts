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

  // 2. Permissions
  const permissionsData = [
    'USER_READ',
    'USER_CREATE',
    'USER_UPDATE',
    'USER_ROLE_ASSIGN',
    'WORKFORCE_CREATE',
    'WORKFORCE_READ',
    'WORKFORCE_APPROVE',
    'DEPARTMENT_CREATE',
    'DEPARTMENT_READ',
    'DEPARTMENT_UPDATE',
    'POSITION_CREATE',
    'POSITION_READ',
    'POSITION_UPDATE',
    'RECRUITMENT_CREATE',
    'RECRUITMENT_READ',
    'RECRUITMENT_UPDATE',
    'PAYROLL_APPROVE',
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

  // 3. Assign all permissions to HEAD_OF_HR
  const headOfHrRole = roles.find((r) => r.name === 'HEAD_OF_HR');
  if (headOfHrRole) {
    for (const perm of permissions) {
      await prisma.rolePermission.upsert({
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
      });
    }
  }

  
  // 3b. Assign specific permissions to HR_ADMIN (can create/manage org structure)
  const hrAdminRole = roles.find((r) => r.name === 'HR_ADMIN');
  if (hrAdminRole) {
    const adminPerms = permissions.filter(p => [
      'DEPARTMENT_CREATE', 'DEPARTMENT_READ', 'DEPARTMENT_UPDATE',
      'POSITION_CREATE', 'POSITION_READ', 'POSITION_UPDATE',
      'WORKFORCE_READ', 'WORKFORCE_CREATE'
    ].includes(p.action));
    
    for (const perm of adminPerms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: hrAdminRole.id, permissionId: perm.id } },
        update: {}, create: { roleId: hrAdminRole.id, permissionId: perm.id },
      });
    }
  }

  // 3c. Assign specific permissions to HR_RECRUITMENT (can view org, create workforce requests)
  const hrRecruitmentRole = roles.find((r) => r.name === 'HR_RECRUITMENT');
  if (hrRecruitmentRole) {
    const recPerms = permissions.filter(p => [
      'DEPARTMENT_READ', 'POSITION_READ', 
      'WORKFORCE_CREATE', 'WORKFORCE_READ', 'RECRUITMENT_CREATE', 'RECRUITMENT_READ', 'RECRUITMENT_UPDATE'
    ].includes(p.action));
    
    for (const perm of recPerms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: hrRecruitmentRole.id, permissionId: perm.id } },
        update: {}, create: { roleId: hrRecruitmentRole.id, permissionId: perm.id },
      });
    }
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
