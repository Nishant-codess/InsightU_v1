# Bugfix Requirements Document

## Introduction

The InsightU platform's authentication system has multiple critical failures preventing users from logging in. These issues affect both email/password authentication and Google OAuth login flows. The bugs prevent users from seeing password input, toggling password visibility, successfully authenticating with valid credentials, and completing Google OAuth login. This document defines the defective behaviors, expected correct behaviors, and behaviors that must remain unchanged to prevent regressions.

## Bug Analysis

### Current Behavior (Defect)

**Password Field Visibility Issues:**

1.1 WHEN a user types in the password field THEN the system displays text that is not visible due to color contrast issues (white text on white/light background or same color as background)

1.2 WHEN a user clicks the eye icon to toggle password visibility THEN the system does not properly show/hide the password text

1.3 WHEN a user types in the password field with the eye icon visible THEN the eye button overlaps with the password text making it difficult to read

**Email/Password Login Issues:**

1.4 WHEN a user enters valid credentials from YOUR_CREDENTIALS.md (e.g., admin@srmist.edu.in / admin123) THEN the system returns "Invalid email or password" error despite credentials being correct

1.5 WHEN a user attempts to login with email/password THEN the system fails to authenticate even when the database contains matching user records

**Google OAuth Login Issues:**

1.6 WHEN a user completes the Google OAuth permissions page and grants access THEN the system returns "login failed" error instead of creating a session

1.7 WHEN the Google OAuth callback is triggered with an authorization code THEN the system fails to exchange the code for tokens and complete the login flow

### Expected Behavior (Correct)

**Password Field Visibility Fixes:**

2.1 WHEN a user types in the password field THEN the system SHALL display visible dots/bullets or text with sufficient color contrast (e.g., white text on dark background)

2.2 WHEN a user clicks the eye icon to toggle password visibility THEN the system SHALL correctly switch between showing plain text password and masked password (dots/bullets)

2.3 WHEN a user types in the password field with the eye icon visible THEN the system SHALL position the eye button with adequate spacing to prevent text overlap (e.g., right padding on input field)

**Email/Password Login Fixes:**

2.4 WHEN a user enters valid credentials that exist in the database THEN the system SHALL successfully authenticate and return user data with access tokens

2.5 WHEN a user enters credentials matching YOUR_CREDENTIALS.md (admin@srmist.edu.in / admin123, nr0070@srmist.edu.in / password123, etc.) THEN the system SHALL successfully log the user in and redirect to dashboard

**Google OAuth Login Fixes:**

2.6 WHEN a user completes the Google OAuth permissions page and grants access THEN the system SHALL successfully exchange the authorization code for tokens and create/retrieve the user session

2.7 WHEN the Google OAuth callback receives a valid authorization code THEN the system SHALL complete the token exchange, retrieve user profile, and return authentication tokens

### Unchanged Behavior (Regression Prevention)

**Authentication Flows:**

3.1 WHEN a user with OAuth-only account (no password) attempts email/password login THEN the system SHALL CONTINUE TO return "This account uses OAuth authentication" error

3.2 WHEN a user enters invalid credentials (wrong email or password) THEN the system SHALL CONTINUE TO return "Invalid email or password" error

3.3 WHEN a user successfully logs in THEN the system SHALL CONTINUE TO generate JWT access and refresh tokens

3.4 WHEN a user successfully logs in THEN the system SHALL CONTINUE TO redirect to the dashboard

**UI/UX Behaviors:**

3.5 WHEN a user interacts with the email input field THEN the system SHALL CONTINUE TO display the email icon and maintain current styling

3.6 WHEN a user submits the login form THEN the system SHALL CONTINUE TO show loading state and disable the submit button

3.7 WHEN a user clicks "Forgot Password" or "Register now" links THEN the system SHALL CONTINUE TO navigate to the respective pages

**Google OAuth Flows:**

3.8 WHEN a Google OAuth user does not exist in the database THEN the system SHALL CONTINUE TO return needsProfile flag and redirect to registration

3.9 WHEN a Google OAuth user exists in the database THEN the system SHALL CONTINUE TO retrieve their profile data (student/teacher/parent/admin)

3.10 WHEN Google OAuth credentials are not configured in .env THEN the system SHALL CONTINUE TO throw "Google OAuth credentials not configured" error
