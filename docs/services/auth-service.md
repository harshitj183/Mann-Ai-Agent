# Auth Service

**Port:** `3001`
**Path:** `backend/auth-service/`
**Role:** User registration, login, JWT token management

---

## Folder Structure

```
auth-service/
├── src/
│   ├── index.js              ← Server start
│   ├── db.js                 ← PostgreSQL pool + table init
│   ├── config/
│   │   └── constants.js      ← JWT_SECRET, PORT
│   ├── middleware/
│   │   └── auth.js           ← verifyToken middleware
│   └── routes/
│       └── auth.routes.js    ← signup, login, verify, me
├── .env                      ← DATABASE_URL, PORT
└── package.json
```

---

## Environment Variables

```env
DATABASE_URL=postgresql://postgres.dush3xg41u7h:***@localhost:5433/postgres
PORT=3001
```

---

## API Endpoints

### `POST /signup`
```json
// Request
{ "name": "John", "email": "john@example.com", "password": "secret123" }

// Response 201
{
  "message": "User created successfully",
  "token": "eyJhbG...",
  "user": { "id": 1, "name": "John", "email": "john@example.com" }
}
```

### `POST /login`
```json
// Request
{ "email": "john@example.com", "password": "secret123" }

// Response 200
{
  "message": "Login successful",
  "token": "eyJhbG...",
  "user": { "id": 1, "name": "John", "email": "john@example.com" }
}
```

### `GET /verify` (requires Bearer token)
```json
// Response 200
{ "valid": true, "user": { "id": 1, "email": "...", "name": "..." } }
```

### `GET /me` (requires Bearer token)
```json
// Response 200
{ "user": { "id": 1, "email": "...", "name": "..." } }
```

---

## Security

- Passwords → `bcrypt` hash with salt rounds 10
- JWT → signed with `JWT_SECRET`, expires in `24h`
- Sessions → stored in DB with `expires_at` timestamp

---

## Dependencies

```json
{
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2",
  "pg": "8.13.3",
  "dotenv": "16.4.7",
  "express": "^4.21.0",
  "cors": "^2.8.5"
}
```
