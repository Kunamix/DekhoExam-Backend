# Exam Dekho API Documentation

## Overview

This API uses Firebase Authentication for phone number verification. OTP verification is handled client-side via Firebase SDK, and the server validates the Firebase ID token.

**Base URL:** `/api/v1`

**Authentication:** JWT tokens via cookies or Authorization header

---

## Mobile Authentication APIs

Base path: `/api/v1/mobile/auth`

---

### 1. Login with Firebase Token

**Endpoint:** `POST /api/v1/mobile/auth/login`

**Description:** Authenticates a user using a Firebase ID token obtained after phone OTP verification on the client side. Creates a new user if one doesn't exist.

**Authentication:** None required

#### Request

**Headers:**
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `Content-Type` | string | Yes | `application/json` |
| `x-device-id` | string | No | Device identifier (defaults to "unknown-device") |
| `User-Agent` | string | No | User agent string |

**Body:**

```json
{
  "firebaseToken": "string (required)"
}
```

| Field           | Type   | Required | Description                                             |
| --------------- | ------ | -------- | ------------------------------------------------------- |
| `firebaseToken` | string | Yes      | Firebase ID token from client-side phone authentication |

#### Response

**Success (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "user": {
      "id": "string",
      "phoneNumber": "string",
      "name": "string | null",
      "email": "string | null",
      "avatar": "string | null",
      "role": "STUDENT",
      "isActive": true,
      "isEmailVerified": false,
      "isPhoneVerified": true,
      "freeTestsUsed": 0,
      "createdAt": "2026-02-24T10:00:00.000Z",
      "updatedAt": "2026-02-24T10:00:00.000Z",
      "lastLoginAt": "2026-02-24T10:00:00.000Z"
    },
    "accessToken": "string",
    "refreshToken": "string"
  },
  "message": "User logged in successfully",
  "success": true
}
```

**Cookies Set:**
| Cookie | Max Age | HttpOnly | Secure |
|--------|---------|----------|--------|
| `accessToken` | 3 days | Yes | Production only |
| `refreshToken` | 7 days | Yes | Production only |

**Error Responses:**

| Status | Message                                            | Description                                 |
| ------ | -------------------------------------------------- | ------------------------------------------- |
| 400    | "Firebase token is required"                       | Missing firebaseToken in request body       |
| 400    | "Please provide phone number"                      | Firebase token doesn't contain phone number |
| 401    | "Invalid or expired Firebase token"                | Firebase token verification failed          |
| 403    | "Your account has been deactivated. Contact Admin" | User account is deactivated                 |

---

### 2. Logout

**Endpoint:** `POST /api/v1/mobile/auth/logout`

**Description:** Logs out the current user by invalidating the session.

**Authentication:** Required (Bearer token or cookie)

#### Request

**Headers:**
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `Authorization` | string | Yes\* | `Bearer <accessToken>` |

\*Or `accessToken` cookie

**Body (optional):**

```json
{
  "refreshToken": "string"
}
```

#### Response

**Success (200 OK):**

```json
{
  "statusCode": 200,
  "data": {},
  "message": "User logged out successfully",
  "success": true
}
```

**Cookies Cleared:**

- `accessToken`
- `refreshToken`

---

### 3. Get Current User Profile

**Endpoint:** `GET /api/v1/mobile/auth/me`

**Description:** Retrieves the currently authenticated user's profile.

**Authentication:** Required (Bearer token or cookie)

#### Request

**Headers:**
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `Authorization` | string | Yes\* | `Bearer <accessToken>` |

\*Or `accessToken` cookie

#### Response

**Success (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "id": "string",
    "name": "string | null",
    "email": "string | null",
    "phoneNumber": "string",
    "avatar": "string | null",
    "role": "STUDENT",
    "isActive": true,
    "isEmailVerified": false,
    "isPhoneVerified": true,
    "freeTestsUsed": 0,
    "createdAt": "2026-02-24T10:00:00.000Z",
    "updatedAt": "2026-02-24T10:00:00.000Z"
  },
  "message": "User profile fetched successfully",
  "success": true
}
```

**Error Responses:**

| Status | Message                | Description                    |
| ------ | ---------------------- | ------------------------------ |
| 401    | "Unauthorized request" | Missing or invalid token       |
| 404    | "User not found"       | User doesn't exist in database |

---

## Admin Authentication APIs

Base path: `/api/v1/admin/auth`

---

### 1. Admin Login

**Endpoint:** `POST /api/v1/admin/auth/login`

**Description:** Authenticates an admin user using either email/password or Firebase phone authentication. Only users with `ADMIN` role can login.

**Authentication:** None required

#### Request

**Headers:**
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `Content-Type` | string | Yes | `application/json` |
| `User-Agent` | string | No | User agent string |

**Body (Option 1 - Email/Password):**

```json
{
  "email": "admin@example.com",
  "password": "securePassword123",
  "deviceId": "string (optional)",
  "deviceName": "string (optional)",
  "deviceType": "WEB | MOBILE (optional)"
}
```

**Body (Option 2 - Firebase Phone Auth):**

```json
{
  "firebaseToken": "string",
  "deviceId": "string (optional)",
  "deviceName": "string (optional)",
  "deviceType": "WEB | MOBILE (optional)"
}
```

| Field           | Type   | Required    | Description                              |
| --------------- | ------ | ----------- | ---------------------------------------- |
| `email`         | string | Conditional | Required for password login              |
| `password`      | string | Conditional | Required with email                      |
| `firebaseToken` | string | Conditional | Required for phone login                 |
| `deviceId`      | string | No          | Device identifier (default: "web-admin") |
| `deviceName`    | string | No          | Device name (default: "Admin Panel")     |
| `deviceType`    | string | No          | "WEB" or "MOBILE" (default: "WEB")       |

#### Response

**Success - Password Login (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "user": {
      "id": "string",
      "name": "string | null",
      "email": "admin@example.com",
      "role": "ADMIN"
    },
    "accessToken": "string",
    "refreshToken": "string"
  },
  "message": "Login successful",
  "success": true
}
```

**Success - Firebase Phone Login (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "user": {
      "id": "string",
      "name": "string | null",
      "phoneNumber": "+919876543210",
      "role": "ADMIN",
      "email": "string | null"
    },
    "accessToken": "string",
    "refreshToken": "string"
  },
  "message": "Login successful",
  "success": true
}
```

**Cookies Set:**
| Cookie | Max Age | HttpOnly | Secure |
|--------|---------|----------|--------|
| `accessToken` | 3 days | Yes | Production only |
| `refreshToken` | 7 days | Yes | Production only |

**Error Responses:**

| Status | Message                             | Description                              |
| ------ | ----------------------------------- | ---------------------------------------- |
| 400    | "Please provide all fields"         | Neither email nor firebaseToken provided |
| 401    | "Invalid credentials"               | Wrong email/password                     |
| 401    | "Please use OTP login"              | Admin has no password set                |
| 401    | "Invalid or expired Firebase token" | Firebase token verification failed       |
| 401    | "Invalid phone number"              | Phone number not associated with admin   |

---

### 2. Refresh Token

**Endpoint:** `POST /api/v1/admin/auth/refresh-token`

**Description:** Refreshes the access token using the refresh token stored in cookies.

**Authentication:** None required (uses refresh token from cookie)

#### Request

**Cookies Required:**
| Cookie | Description |
|--------|-------------|
| `refreshToken` | Valid refresh token |

#### Response

**Success (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "accessToken": "string",
    "refreshToken": "string"
  },
  "message": "Token refreshed successfully",
  "success": true
}
```

**Cookies Updated:**
| Cookie | Max Age | HttpOnly | Secure |
|--------|---------|----------|--------|
| `accessToken` | 3 days | Yes | Production only |
| `refreshToken` | 7 days | Yes | Production only |

**Error Responses:**

| Status | Message                            | Description                 |
| ------ | ---------------------------------- | --------------------------- |
| 401    | "Refresh token required"           | No refresh token in cookies |
| 401    | "Invalid or expired refresh token" | Token verification failed   |
| 401    | "Invalid refresh token"            | Token not found in database |
| 401    | "Session expired"                  | Refresh token has expired   |

---

### 3. Admin Logout

**Endpoint:** `POST /api/v1/admin/auth/logout`

**Description:** Logs out the admin user by deleting all their sessions.

**Authentication:** Required (Admin only)

#### Request

**Headers:**
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `Authorization` | string | Yes\* | `Bearer <accessToken>` |

\*Or `accessToken` cookie

#### Response

**Success (200 OK):**

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Logout successful",
  "success": true
}
```

**Cookies Cleared:**

- `accessToken`
- `refreshToken`

**Error Responses:**

| Status | Message        | Description              |
| ------ | -------------- | ------------------------ |
| 401    | "Unauthorized" | Missing or invalid token |

---

### 4. Get Admin Profile

**Endpoint:** `GET /api/v1/admin/auth/me`

**Description:** Retrieves the currently authenticated admin's profile.

**Authentication:** Required (Admin only)

#### Request

**Headers:**
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `Authorization` | string | Yes\* | `Bearer <accessToken>` |

\*Or `accessToken` cookie

#### Response

**Success (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "id": "string",
    "phoneNumber": "string | null",
    "email": "admin@example.com",
    "name": "string | null",
    "avatar": "string | null",
    "role": "ADMIN",
    "isActive": true,
    "isEmailVerified": true,
    "isPhoneVerified": true,
    "freeTestsUsed": 0,
    "lastLoginAt": "2026-02-24T10:00:00.000Z",
    "createdAt": "2026-02-24T10:00:00.000Z",
    "updatedAt": "2026-02-24T10:00:00.000Z"
  },
  "message": "User info fetched successfully",
  "success": true
}
```

**Error Responses:**

| Status | Message                | Description              |
| ------ | ---------------------- | ------------------------ |
| 401    | "Session expired"      | Missing user ID in token |
| 401    | "Unauthorized request" | User is not an admin     |

---

## Authentication Flow

### Mobile User Flow (Firebase Phone Auth)

```
1. Client: User enters phone number
2. Client: Firebase SDK sends OTP to phone
3. Client: User enters OTP
4. Client: Firebase SDK verifies OTP and returns ID token
5. Client: POST /api/v1/mobile/auth/login with { firebaseToken }
6. Server: Verifies Firebase token, creates/updates user, returns JWT tokens
7. Client: Uses accessToken for subsequent API calls
```

### Admin Password Flow

```
1. Admin: POST /api/v1/admin/auth/login with { email, password }
2. Server: Validates credentials, returns JWT tokens
3. Admin: Uses accessToken for subsequent API calls
```

### Admin Phone Auth Flow

```
1. Admin: Uses Firebase SDK for phone authentication (client-side)
2. Admin: POST /api/v1/admin/auth/login with { firebaseToken }
3. Server: Verifies Firebase token & checks admin role
4. Server: Returns JWT tokens
```

---

## Token Information

| Token         | Expiry | Storage                       |
| ------------- | ------ | ----------------------------- |
| Access Token  | 3 days | Cookie / Authorization header |
| Refresh Token | 7 days | Cookie                        |

---

## Common Error Response Format

All error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Error message here",
  "success": false
}
```

---

## HTTP Status Codes Used

| Code | Meaning                                       |
| ---- | --------------------------------------------- |
| 200  | Success                                       |
| 400  | Bad Request - Invalid input                   |
| 401  | Unauthorized - Authentication required/failed |
| 403  | Forbidden - Account deactivated               |
| 404  | Not Found - Resource doesn't exist            |
| 429  | Too Many Requests - Rate limited              |
| 500  | Internal Server Error                         |
