import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { logAudit } from './auditService';
import { sendAccountInvitationEmail } from './emailService';
import { generateTokens } from './authService';

export const provisionEmployeeAccount = async (employeeId: number, initiatorUserId: number) => {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      user: {
        include: {
          roles: { include: { role: true } }
        }
      }
    }
  });

  if (!employee) {
    throw new AppError('Employee not found', 404);
  }

  if (!employee.email) {
    throw new AppError('Employee does not have a verified email address', 400);
  }

  // Find or verify EMPLOYEE role
  let employeeRole = await prisma.role.findUnique({ where: { name: 'EMPLOYEE' } });
  if (!employeeRole) {
    employeeRole = await prisma.role.create({
      data: {
        name: 'EMPLOYEE',
        description: 'Standard employee portal access for self-service activities'
      }
    });
  }

  let userId: number;

  if (employee.user) {
    // Already has a user account (active or pending activation) - re-invitation / credential setup
    userId = employee.user.id;
    // Ensure EMPLOYEE role is assigned
    const hasRole = employee.user.roles.some(r => r.role.name === 'EMPLOYEE');
    if (!hasRole) {
      await prisma.userRole.create({
        data: {
          userId,
          roleId: employeeRole.id
        }
      });
    }
  } else {
    // Check if user with that email already exists
    const existingUser = await prisma.user.findUnique({ where: { email: employee.email } });
    if (existingUser) {
      // Check if that user is already linked to another employee
      const otherEmp = await prisma.employee.findUnique({ where: { userId: existingUser.id } });
      if (otherEmp && otherEmp.id !== employee.id) {
        throw new AppError('A user account with this email already belongs to another employee', 409);
      }
      userId = existingUser.id;
      // Link to this employee
      await prisma.employee.update({
        where: { id: employee.id },
        data: { userId }
      });
      // Ensure EMPLOYEE role
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId, roleId: employeeRole.id } },
        create: { userId, roleId: employeeRole.id },
        update: {}
      });
    } else {
      // Create fresh User account in inactive status with random cryptographic placeholder password
      const placeholderPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const newUser = await prisma.user.create({
        data: {
          email: employee.email,
          password: placeholderPassword,
          isActive: false,
          roles: {
            create: { roleId: employeeRole.id }
          }
        }
      });
      userId = newUser.id;

      // Link to employee
      await prisma.employee.update({
        where: { id: employee.id },
        data: { userId }
      });
    }
  }

  // Invalidate any previous unused invitation tokens for this employee
  await prisma.accountInvitation.deleteMany({
    where: {
      employeeId: employee.id,
      usedAt: null
    }
  });

  // Generate secure single-use time-limited token (24 hours)
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const invitation = await prisma.accountInvitation.create({
    data: {
      token,
      employeeId: employee.id,
      userId,
      email: employee.email,
      expiresAt
    }
  });

  // Audit logs
  await logAudit('EMPLOYEE_ACCOUNT_PROVISIONED', initiatorUserId, {
    employeeId: employee.id,
    userId,
    email: employee.email
  });
  await logAudit('INVITATION_SENT', initiatorUserId, {
    employeeId: employee.id,
    invitationId: invitation.id,
    expiresAt
  });

  // Send invitation email
  await sendAccountInvitationEmail(employee.email, employee.firstName, token, expiresAt);

  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const invitationLink = `${appUrl}/employee/activate?token=${encodeURIComponent(token)}`;

  return {
    employeeId: employee.id,
    userId,
    email: employee.email,
    token,
    invitationLink,
    expiresAt
  };
};

export const verifyInvitationToken = async (token: string) => {
  if (!token || typeof token !== 'string') {
    throw new AppError('Invitation token is required', 400);
  }

  const invitation = await prisma.accountInvitation.findUnique({
    where: { token },
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          email: true,
          department: { select: { name: true } },
          position: { select: { title: true } }
        }
      },
      user: {
        select: {
          id: true,
          email: true,
          isActive: true
        }
      }
    }
  });

  if (!invitation) {
    throw new AppError('Invalid invitation token', 400);
  }

  if (invitation.usedAt) {
    throw new AppError('This invitation has already been used. Please log in or request a new invitation.', 400);
  }

  if (invitation.expiresAt < new Date()) {
    throw new AppError('This invitation link has expired. Please contact your HR administrator for a new invitation.', 400);
  }

  return {
    email: invitation.email,
    firstName: invitation.employee.firstName,
    lastName: invitation.employee.lastName,
    employeeId: invitation.employee.employeeId,
    department: invitation.employee.department?.name,
    position: invitation.employee.position?.title,
    expiresAt: invitation.expiresAt
  };
};

export const acceptInvitation = async (token: string, newPassword: string) => {
  if (!token || typeof token !== 'string') {
    throw new AppError('Invitation token is required', 400);
  }

  const invitation = await prisma.accountInvitation.findUnique({
    where: { token },
    include: {
      employee: true,
      user: {
        include: {
          roles: { include: { role: true } }
        }
      }
    }
  });

  if (!invitation) {
    throw new AppError('Invalid invitation token', 400);
  }

  if (invitation.usedAt) {
    throw new AppError('This invitation token has already been used', 400);
  }

  if (invitation.expiresAt < new Date()) {
    throw new AppError('This invitation link has expired', 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Transaction: Activate user, update password, mark invitation used
  await prisma.$transaction([
    prisma.user.update({
      where: { id: invitation.userId },
      data: {
        password: hashedPassword,
        isActive: true
      }
    }),
    prisma.accountInvitation.update({
      where: { id: invitation.id },
      data: {
        usedAt: new Date()
      }
    })
  ]);

  await logAudit('ACCOUNT_ACTIVATED', invitation.userId, {
    employeeId: invitation.employeeId,
    email: invitation.email
  });

  // Generate tokens for seamless authentication
  const tokens = await generateTokens(invitation.userId);

  const flattenedUser = {
    id: invitation.user.id,
    email: invitation.user.email,
    roles: invitation.user.roles.map(r => r.role.name)
  };

  return {
    ...tokens,
    user: flattenedUser
  };
};
