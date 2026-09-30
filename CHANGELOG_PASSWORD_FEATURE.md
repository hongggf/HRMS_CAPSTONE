# Password Management Feature - Implementation Details

This document outlines the implementation details and security enhancements made to the HRMS backend to support the "Change Password" functionality.

## Overview
Initially, users created by the Head of HR were assigned a default or initial password. To improve security and allow users full control over their accounts, a feature was added allowing authenticated users to change their own passwords securely.

## 1. Feature Implementation
- **New API Endpoint:** Added `POST /api/v1/auth/change-password` which allows any authenticated user to update their password.
- **Controller Logic:** Implemented `changePassword` in `authController.ts` which:
  - Verifies the user is currently authenticated via JWT.
  - Checks the database to ensure the user exists and is active.
  - Verifies the provided `oldPassword` matches the user's current hashed password using `bcrypt.compare`.
  - Hashes the `newPassword` and updates the user record.
  - Logs a `PASSWORD_CHANGED` audit event for compliance tracking.

## 2. Security Enhancements
To ensure enterprise-grade security for user authentication, several robust security layers were added:

### Strong Password Policy
- **Regex Enforcement:** Passwords must now be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.
- **Widespread Application:** This policy is enforced via Zod schemas in `authValidators.ts` (for changing passwords) and `userValidators.ts` (for creating new users).
- **Password Reuse Prevention:** A specific Zod refinement prevents the user from setting their new password to exactly match their old password.

### Session Revocation
- **Global Logout on Password Change:** Changing a password now forcefully invalidates all active sessions for that user. This is achieved by updating all active `refreshToken` entries in the database to `revoked: true`.
- **Database Transactions:** The password update and token revocation are wrapped in a Prisma database transaction (`prisma.$transaction`). This guarantees atomicity, meaning either both operations succeed, or neither does, preventing inconsistent database states.

### Rate Limiting
- **Brute-Force Mitigation:** Added a specific `changePasswordLimiter` middleware to the `change-password` route. This restricts users to a maximum of 3 password change attempts per hour, mitigating automated brute-force attacks against the endpoint.

## 3. Documentation Updates
- **Postman Collection Updated:** The Postman documentation located at `docs/HRMS_API.postman_collection.json` was updated to include the `Change Password` request under the `02. Authentication` folder. It comes pre-configured with the required JSON body and automatically inherits the Bearer token from the environment.

## 4. Testing
- Verified that all existing unit and integration tests (such as `tests/auth.test.ts` and `tests/app.test.ts`) continue to pass seamlessly with the newly added validations and route.
