# API Specification & Conventions

## Overview
- **Base URL:** `/api/v1`
- **Protocol:** HTTPS REST API
- **Header for Authentication:** `Authorization: Bearer <accessToken>`
- **Header for Idempotency:** `x-idempotency-key: <UUID>`

---

## Response Envelope Structure

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "بيانات غير صحيحة",
    "details": [
      {
        "field": "username",
        "message": "اسم المستخدم مطلوب"
      }
    ]
  }
}
```

---

## Authentication Endpoints

### 1. Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Body:**
  ```json
  {
    "username": "merchant",
    "password": "password123"
  }
  ```
- **Response:** Returns JWT `accessToken` valid for 15 days.

### 2. Current User Profile
- **Endpoint:** `GET /api/v1/auth/me`
- **Headers:** `Authorization: Bearer <token>`

---

## System Health
- **Endpoint:** `GET /api/v1/health`
- **Public access**
