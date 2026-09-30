import { prisma } from '../config/db';

export const listRolesFromDB = async () => {
  const rolesRaw = await prisma.role.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      permissions: {
        include: {
          permission: true
        }
      }
    },
    orderBy: { id: 'asc' }
  });

  return rolesRaw.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    permissions: r.permissions.map(p => p.permission.action)
  }));
};
