# FameHub LMS Security Architecture

This document describes the security protocols, encryption mechanisms, and middleware protections integrated into the FameHub LMS.

## Core Protections

### 1. Authentication & Session Security
- **Stricter Access Tokens**: JWT tokens are signed using SHA-256 and expire in 15 minutes.
- **Refresh Token Rotation (RTR)**: Upon refresh, the previous token is revoked immediately, preventing replay attacks.
- **Secure HttpOnly Cookies**: Refresh tokens are stored in browser cookies configured with:
  - `httpOnly: true` (inaccessible to client-side scripts to prevent XSS-based theft)
  - `secure: true` (only transmitted over HTTPS connections in production)
  - `sameSite: 'lax'` (protects against CSRF leakage)

### 2. Cross-Site Request Forgery (CSRF) Protection
- Implements a double-submit cookie validation middleware.
- When `CSRF_ENABLED=true` is set, mutating requests (POST, PUT, DELETE, PATCH) are validated by comparing the `csrfToken` cookie against the custom `X-CSRF-Token` header.

### 3. Input Validation and Sanitization
- All mutating endpoints validate incoming requests using rules configured in `backend/middleware/requestValidator.js`.
- HTML tags are escaped and dangerous parameters are sanitized using `express-validator` to eliminate Cross-Site Scripting (XSS) and SQL Injection vectors.

### 4. Express Rate Limiting
- **Global limiter**: Blocks flooding by limiting requests to 200 per 15 minutes per IP address.
- **Authentication limiter**: Stricter rates on register, login, refresh, and password reset endpoints (maximum 25 attempts per 15 minutes).

### 5. Secure HTTP Headers (Helmet)
- Helmet middleware is enabled to secure response headers:
  - `X-Frame-Options: SAMEORIGIN` (prevents clickjacking)
  - `Strict-Transport-Security` (enforces HTTPS)
  - `Content-Security-Policy` (strict script and style source directives)
