# Moka Cafe Social - Backend

REST API for a cafe-themed social media app, built with Node.js, Express, and MongoDB.

## Features

- Register, login, and logout with JWT stored in an httpOnly cookie
- Passwords hashed with bcrypt
- Input validation with zod
- Posts: create, read, update, delete (owner only)
- Likes and saves
- Comments
- User profiles and settings, with password change
- Search for users and posts
- Image uploads (avatar, cover, posts)
- Rate limiting, security headers, and a global error handler

## Tech Stack

Node.js, Express, MongoDB (Mongoose), JWT, bcrypt, zod, multer, helmet

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your values.

3. Run in development mode:

```bash
npm run dev
```

The server runs on `http://localhost:5000` by default.

## Environment Variables

| Name | Description |
|---|---|
| `PORT` | Server port (default 5000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string used to sign tokens |
| `CLIENT_URL` | Allowed frontend origin(s), comma-separated |
| `NODE_ENV` | `development` or `production` |

## Project Structure

```
├── server.js
└── src/
    ├── controllers/   request logic
    ├── middleware/    auth, validation, uploads, rate limits, errors
    ├── models/        Mongoose schemas
    ├── routes/        API routes
    ├── utils/         helpers
    └── validators/    zod schemas
```

## API Endpoints

### Auth

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create an account |
| POST | `/api/auth/login` | No | Log in |
| POST | `/api/auth/logout` | No | Log out |
| GET | `/api/auth/me` | Yes | Current user |

### Users

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/users?search=` | No | Search users by name or username |
| GET | `/api/users/:username` | No | Public profile with posts |
| PATCH | `/api/users/me` | Yes | Edit my profile |
| PATCH | `/api/users/me/password` | Yes | Change my password |

### Posts

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/posts?page=1&limit=10&search=` | No | List and search posts |
| GET | `/api/posts/:id` | No | Get one post |
| GET | `/api/posts/saved` | Yes | Posts saved by me |
| POST | `/api/posts` | Yes | Create a post |
| PATCH | `/api/posts/:id` | Yes | Edit my post |
| DELETE | `/api/posts/:id` | Yes | Delete my post (and its comments) |
| POST | `/api/posts/:id/like` | Yes | Toggle like |
| POST | `/api/posts/:id/save` | Yes | Toggle save |

### Comments

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/posts/:postId/comments` | No | List comments |
| POST | `/api/posts/:postId/comments` | Yes | Add a comment |
| DELETE | `/api/comments/:id` | Yes | Delete my comment |

### Uploads

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/uploads` | Yes | Upload an image (form-data field `image`, JPG/PNG/WEBP, max 2MB) |

The upload returns a URL like `/uploads/<name>.jpg`. Send that value as `avatar`, `cover`, or `image` when updating a profile or creating a post.

## Roadmap

- [x] Authentication (register, login, logout)
- [x] Posts, likes, and saves
- [x] Comments
- [x] User profiles and settings
- [x] Search
- [x] Image uploads
- [x] Rate limiting and security headers
- [ ] Connect the frontend
- [ ] Deploy

## Security Notes

- Never commit your `.env` file.
- Set `CLIENT_URL` to your frontend origin(s), separated by commas. Browsers from other origins are blocked.
- Login and register are limited to 10 attempts per 15 minutes per IP.
- Uploaded images are stored in `uploads/`. On hosts with temporary storage, use a cloud storage service instead.