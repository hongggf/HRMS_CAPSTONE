import { logger } from '../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    // In production without external SMTP configured, we log the dispatched message securely
    logger.info(`[EmailService] Sending email to: ${options.to} | Subject: "${options.subject}"`);
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[EmailService Text Preview]:\n${options.text || options.html}`);
    }
    return true;
  } catch (error) {
    logger.error('[EmailService] Failed to send email', error);
    return false;
  }
};

export const sendAccountInvitationEmail = async (
  email: string,
  firstName: string,
  activationToken: string,
  expiresAt: Date
) => {
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const activationUrl = `${appUrl}/employee/activate?token=${encodeURIComponent(activationToken)}`;

  const subject = 'Welcome to HRMS - Complete Your Employee Account Setup';
  const text = `Hello ${firstName},

Welcome to the company! Your HR administrator has provisioned your Employee Self-Service (ESS) account.

Please activate your account and set your secure password by visiting the link below:
${activationUrl}

This activation link is single-use and will expire in 24 hours on ${expiresAt.toUTCString()}.

If you did not expect this invitation, please notify your HR administrator immediately.

Best regards,
Human Resources Team`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e8e8e8; border-radius: 8px;">
      <h2 style="color: #1677ff;">Welcome to HRMS!</h2>
      <p>Hello <strong>${firstName}</strong>,</p>
      <p>Your HR administrator has provisioned your Employee Self-Service (ESS) account.</p>
      <p>Please click the button below to create your password and activate your account:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${activationUrl}" style="background-color: #1677ff; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
          Activate My Account
        </a>
      </div>
      <p style="font-size: 13px; color: #666;">Or copy and paste this link into your browser:<br/>
        <a href="${activationUrl}">${activationUrl}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #999;">
        This single-use link will expire in 24 hours (${expiresAt.toUTCString()}).<br/>
        If you did not request this invitation, please ignore this email or contact your HR department.
      </p>
    </div>
  `;

  return await sendEmail({ to: email, subject, text, html });
};
