# Authentication Login Failures Bugfix Design

## Overview

The InsightU platform's authentication system has multiple critical failures across three main areas: password field visibility issues in the UI, email/password authentication failures in the backend, and Google OAuth callback failures. This design document formalizes the bug conditions, analyzes root causes, and outlines a targeted fix strategy that addresses all authentication issues while preserving existing functionality.

The fix approach involves:
1. **UI Fixes**: Correcting password field styling for visibility and eye icon positioning
2. **Backend Auth Fixes**: Ensuring proper credential validation and token generation
3. **OAuth Fixes**: Fixing the authorization code exchange flow

## Glossary

- **Bug_Condition (C)**: The conditions that trigger authentication failures - password field visibility issues, valid credential rejection, or OAuth callback failures
- **Property (P)**: The desired behavior - visible password fields with working toggle, successful authentication with valid credentials, and working OAuth flow
- **Preservation**: Existing authentication behaviors that must remain unchanged (error messages for invalid credentials, OAuth-only account handling, token generation)
- **loginWithEmail**: The function in `backend/src/services/auth/emailAuth.ts` that authenticates users with email/password credentials
- **handleGoogleCallback**: The function in `backend/src/services/auth/oauth.ts` that processes Google OAuth authorization codes
- **Input Component**: The reusable input component in `frontend/src/components/ui/Input.tsx` that renders form fields
- **Login Page**: The login form in `frontend/src/pages/auth/Login.tsx` that handles user authentication

## Bug Details

### Bug Condition

The bug manifests in three distinct scenarios:

**Scenario 1: Password Field Visibility**
The password input field has styling issues where the text color matches or has insufficient contrast with the background, making typed characters invisible or difficult to read. Additionally, the eye icon button overlaps with the password text.

**Scenario 2: Email/Password Authentication**
The `loginWithEmail` function rejects valid credentials that exist in the database (e.g., admin@srmist.edu.in / admin123), returning "Invalid email or password" despite the credentials being correct.

**Scenario 3: Google OAuth Callback**
The `handleGoogleCallback` function fails to complete the OAuth flow when receiving a valid authorization code from Google, resulting in "login failed" errors.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type AuthenticationAttempt
  OUTPUT: boolean
  
  RETURN (
    // Password visibility bug
    (input.type == "PASSWORD_FIELD_INTERACTION" 
     AND (passwordTextNotVisible(input) OR eyeIconOverlapsText(input)))
    
    OR
    
    // Email/password auth bug
    (input.type == "EMAIL_PASSWORD_LOGIN" 
     AND credentialsExistInDatabase(input.email, input.password)
     AND authenticationFails(input))
    
    OR
    
    // OAuth callback bug
    (input.type == "GOOGLE_OAUTH_CALLBACK"
     AND input.authorizationCode IS_VALID
     AND callbackFails(input))
  )
END FUNCTION
```

### Examples

**Password Visibility Issues:**
- User types "password123" in password field → sees blank field or barely visible text due to white/light text on white/light background
- User clicks eye icon to show password → toggle doesn't work or text remains masked
- User types long password → eye icon overlaps with the last few characters making them unreadable

**Email/Password Authentication Issues:**
- User enters admin@srmist.edu.in / admin123 (valid credentials from YOUR_CREDENTIALS.md) → receives "Invalid email or password" error
- User enters nr0070@srmist.edu.in / password123 (valid student credentials) → authentication fails despite database containing matching user

**Google OAuth Issues:**
- User completes Google OAuth consent screen → receives "Google login failed" error
- Google redirects to callback URL with valid authorization code → backend fails to exchange code for tokens
- OAuth flow reaches callback endpoint → returns 500 error instead of user session

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- OAuth-only accounts (users without passwordHash) must continue to show "This account uses OAuth authentication" error when attempting email/password login
- Invalid credentials (wrong email or non-existent user) must continue to return "Invalid email or password" error
- Successful logins must continue to generate JWT access and refresh tokens
- Successful logins must continue to redirect to the dashboard
- Email input field styling and icon display must remain unchanged
- Form submission loading state and button disable behavior must remain unchanged
- "Forgot Password" and "Register now" link navigation must remain unchanged
- Google OAuth users not in database must continue to receive needsProfile flag and redirect to registration
- Google OAuth users in database must continue to retrieve their profile data (student/teacher/parent/admin)
- Missing Google OAuth credentials in .env must continue to throw "Google OAuth credentials not configured" error

**Scope:**
All inputs that do NOT involve the three bug scenarios should be completely unaffected by this fix. This includes:
- Invalid login attempts (wrong password, non-existent email)
- OAuth-only account email/password login attempts
- Registration flows
- Token refresh flows
- Other form fields (email input)
- Navigation and routing

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

### Password Field Visibility Issues

1. **Text Color Contrast Problem**: The Input component uses `text-white` class for input text, but the background `bg-surface/50` may be too light, causing insufficient contrast. The password dots/bullets may also be inheriting a light color.

2. **Eye Icon Positioning**: The eye icon button is positioned with `absolute right-3 top-[38px]` but the input field doesn't have sufficient right padding to prevent text overlap. The input only has `px-3` padding, which doesn't account for the icon space.

3. **Password Toggle State**: The `showPassword` state toggle may not be properly updating the input type attribute, or the browser's password masking may not be rendering correctly.

### Email/Password Authentication Issues

1. **Password Hashing Mismatch**: The credentials in YOUR_CREDENTIALS.md may be plain text, but the database may not have properly hashed passwords, or the bcrypt comparison is failing due to incorrect salt rounds or hashing algorithm.

2. **Missing User Records**: The database may not have been seeded with the users from YOUR_CREDENTIALS.md, causing all login attempts to fail with "user not found".

3. **JWT Secret Configuration**: The JWT_SECRET or JWT_REFRESH_SECRET environment variables may be missing, causing token generation to fail after successful authentication.

4. **Database Connection Issues**: The Prisma client may not be properly connected to the database, causing user lookups to fail.

### Google OAuth Callback Issues

1. **Authorization Code Exchange Failure**: The axios POST request to `https://oauth2.googleapis.com/token` may be failing due to incorrect parameters, malformed request body, or invalid client credentials.

2. **Missing Environment Variables**: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_CALLBACK_URL may be missing or incorrect in the .env file.

3. **Token Response Parsing**: The response from Google's token endpoint may have a different structure than expected, causing `tokenResponse.data.access_token` to be undefined.

4. **Profile Retrieval Failure**: The axios GET request to `https://www.googleapis.com/oauth2/v2/userinfo` may be failing due to invalid access token or incorrect headers.

## Correctness Properties

Property 1: Bug Condition - Password Field Visibility and Authentication Success

_For any_ authentication attempt where the bug condition holds (password field interaction with visibility issues, valid credentials being rejected, or OAuth callback with valid code failing), the fixed system SHALL display visible password text with proper contrast, successfully authenticate valid credentials and return user data with tokens, and successfully complete OAuth callback with token exchange.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

Property 2: Preservation - Non-Buggy Authentication Behavior

_For any_ authentication attempt where the bug condition does NOT hold (invalid credentials, OAuth-only account email login, missing OAuth config, etc.), the fixed system SHALL produce exactly the same behavior as the original system, preserving all existing error messages, validation logic, and security checks.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

#### File 1: `frontend/src/components/ui/Input.tsx`

**Changes**:
1. **Add Right Padding for Icon Space**: Add conditional right padding (`pr-10` or `pr-12`) to the input element when it's a password field to prevent eye icon overlap
   - Modify the `cn()` call to include: `type === "password" && "pr-12"`

2. **Improve Text Contrast**: Ensure password text (dots/bullets) are visible by verifying the `text-white` class is applied and the background has sufficient contrast
   - The current `text-white` should work, but verify `bg-surface/50` provides adequate contrast

#### File 2: `frontend/src/pages/auth/Login.tsx`

**Changes**:
1. **Adjust Eye Icon Positioning**: Modify the eye icon button positioning to account for the input's right padding
   - Change `top-[38px]` to a more reliable positioning like `top-1/2 -translate-y-1/2` for vertical centering
   - Ensure `right-3` doesn't overlap with the input's padding

2. **Verify Password Toggle Logic**: Ensure the `showPassword` state correctly toggles between "text" and "password" input types
   - Current implementation looks correct: `type={showPassword ? "text" : "password"}`
   - May need to add explicit styling to ensure browser doesn't override

#### File 3: `backend/src/services/auth/emailAuth.ts`

**Changes**:
1. **Verify Password Hashing**: Ensure bcrypt.compare() is working correctly
   - Current implementation looks correct, but verify SALT_ROUNDS is consistent with seeded data

2. **Add Debug Logging**: Add temporary console.log statements to verify:
   - User is found in database
   - passwordHash exists on user object
   - bcrypt.compare() result

3. **Check JWT Secret Availability**: The code already checks for JWT secrets in registerWithEmail, but loginWithEmail doesn't
   - Add early check: `if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) throw new Error('JWT secrets not configured')`

4. **Database Seeding**: Ensure the database has been seeded with users from YOUR_CREDENTIALS.md
   - Check `backend/prisma/seed.ts` to verify users are created with correct password hashes

#### File 4: `backend/src/services/auth/oauth.ts`

**Changes**:
1. **Fix Token Exchange Request**: Verify the axios POST request to Google's token endpoint
   - Current implementation uses URLSearchParams, which should be correct
   - Add error handling to log the exact error from Google

2. **Verify Environment Variables**: Add explicit check at the start of handleGoogleCallback
   - Already exists, but ensure it's throwing before making API calls

3. **Add Response Validation**: Add checks to ensure tokenResponse.data.access_token exists before using it
   - Add: `if (!accessToken) throw new Error('No access token received from Google')`

4. **Profile Response Validation**: Ensure profile.email exists before proceeding
   - Already exists: `if (!email) throw new Error('No email found in Google profile')`

5. **Improve Error Messages**: Wrap axios calls in try-catch and provide more specific error messages
   - Current implementation has generic error wrapping, enhance with specific error details

#### File 5: `backend/prisma/seed.ts`

**Changes**:
1. **Verify User Seeding**: Ensure all users from YOUR_CREDENTIALS.md are created with properly hashed passwords
   - Check if seed script creates: admin@srmist.edu.in, nr0070@srmist.edu.in, etc.
   - Verify passwords are hashed with bcrypt using SALT_ROUNDS=10

2. **Add Seed Verification**: Add console.log statements to confirm users are created successfully

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate password field interactions, email/password login attempts with valid credentials, and Google OAuth callbacks with valid authorization codes. Run these tests on the UNFIXED code to observe failures and understand the root causes.

**Test Cases**:
1. **Password Visibility Test**: Render Login component, type in password field, verify text is visible (will fail on unfixed code - text not visible)
2. **Eye Icon Toggle Test**: Render Login component, click eye icon, verify input type changes from "password" to "text" (may fail on unfixed code)
3. **Eye Icon Overlap Test**: Render Login component with long password, verify eye icon doesn't overlap text (will fail on unfixed code)
4. **Valid Credentials Test**: Call loginWithEmail with admin@srmist.edu.in / admin123, verify authentication succeeds (will fail on unfixed code - returns "Invalid email or password")
5. **OAuth Callback Test**: Call handleGoogleCallback with valid authorization code, verify token exchange succeeds (will fail on unfixed code - throws error)
6. **Database Seed Verification**: Query database for users from YOUR_CREDENTIALS.md, verify they exist with hashed passwords (may fail if not seeded)

**Expected Counterexamples**:
- Password field text is invisible or has insufficient contrast
- Eye icon overlaps with password text when typing
- Valid credentials from YOUR_CREDENTIALS.md are rejected
- Google OAuth callback fails with "OAuth callback failed" error
- Possible causes: missing CSS padding, incorrect text color, missing database records, incorrect password hashes, malformed OAuth request

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed system produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedAuthenticationSystem(input)
  ASSERT expectedBehavior(result)
END FOR
```

**Specific Checks**:
- Password field text is visible with sufficient contrast
- Eye icon toggles password visibility correctly
- Eye icon has adequate spacing and doesn't overlap text
- Valid credentials authenticate successfully and return tokens
- Google OAuth callback completes successfully with valid code

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed system produces the same result as the original system.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalAuthenticationSystem(input) = fixedAuthenticationSystem(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for invalid credentials, OAuth-only accounts, and other edge cases, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Invalid Credentials Preservation**: Observe that loginWithEmail with wrong password returns "Invalid email or password" on unfixed code, then verify this continues after fix
2. **OAuth-Only Account Preservation**: Observe that loginWithEmail for OAuth-only user returns "This account uses OAuth authentication" on unfixed code, then verify this continues after fix
3. **Missing OAuth Config Preservation**: Observe that handleGoogleCallback throws "Google OAuth credentials not configured" when env vars missing on unfixed code, then verify this continues after fix
4. **Token Generation Preservation**: Observe that successful login generates JWT tokens on unfixed code, then verify this continues after fix
5. **Email Input Styling Preservation**: Observe that email input field styling is unchanged after password field fixes
6. **Form Submission Preservation**: Observe that form submission loading state and button disable behavior continue working after fixes

### Unit Tests

- Test password field rendering with visible text and proper contrast
- Test eye icon toggle functionality (show/hide password)
- Test eye icon positioning with various password lengths
- Test loginWithEmail with valid credentials from YOUR_CREDENTIALS.md
- Test loginWithEmail with invalid credentials (wrong password, non-existent user)
- Test loginWithEmail with OAuth-only account
- Test handleGoogleCallback with valid authorization code
- Test handleGoogleCallback with invalid/missing code
- Test handleGoogleCallback with missing environment variables
- Test database seed script creates users with hashed passwords

### Property-Based Tests

- Generate random password strings and verify they are visible in the password field
- Generate random valid user credentials and verify authentication succeeds
- Generate random invalid credentials and verify appropriate error messages
- Generate random OAuth authorization codes and verify callback handling
- Test that all non-password input fields maintain their styling across many scenarios

### Integration Tests

- Test full login flow: render form, enter valid credentials, submit, verify redirect to dashboard
- Test full OAuth flow: initiate OAuth, simulate callback with code, verify user session created
- Test password visibility toggle: type password, click eye icon, verify text shown, click again, verify text hidden
- Test error handling: enter invalid credentials, verify error message displayed, enter valid credentials, verify error cleared
- Test OAuth error handling: simulate OAuth failure, verify error message, retry with valid flow, verify success
