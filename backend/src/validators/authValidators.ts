import { z } from 'zod';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const passwordErrorMessage = 'Password must be at least 8 characters, and include uppercase, lowercase, number, and special character.';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1, 'Old password is required'),
    newPassword: z.string().regex(passwordRegex, passwordErrorMessage),
  }),
}).refine(data => data.body.oldPassword !== data.body.newPassword, {
  message: "New password must be different from the old password",
  path: ["body", "newPassword"],
});

export const acceptInvitationSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Invitation token is required'),
    password: z.string().regex(passwordRegex, passwordErrorMessage),
  }),
});

export const verifyInvitationSchema = z.object({
  query: z.object({
    token: z.string().min(1, 'Invitation token is required'),
  }),
});


