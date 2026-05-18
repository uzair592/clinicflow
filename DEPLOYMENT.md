# Phase 6 Deployment Notes

## Backend on Render

1. Push this project to GitHub.
2. Create a Render Web Service from the repo.
3. Use `npm ci` as the build command and `npm start` as the start command.
4. Set `PORT=10000` and `NODE_ENV=production`.
5. Add the variables from `.env.example`.
6. In MongoDB Atlas, allow Render dynamic IPs by whitelisting `0.0.0.0/0`.
7. Set `CLIENT_URL` to the deployed Vercel URL.

The included `render.yaml` can be used as Render Blueprint configuration.

## Frontend on Vercel

1. Import the repo into Vercel.
2. Set the build command to `cd client && npm ci && npm run build`.
3. Set the output directory to `client/dist`.
4. Add `VITE_API_URL=https://your-render-service.onrender.com/api/v1`.

## CI Deploy Secrets

The GitHub Actions workflow runs checks on every push to `main`. Deployment steps are enabled when these secrets exist:

- `RENDER_DEPLOY_HOOK_URL`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## SaaS Setup

After creating an admin user, seed the default plans once:

```http
POST /api/v1/subscriptions/seed
Authorization: Bearer <admin-token>
```

Free plan users are limited to 20 patients and cannot call `/api/v1/ai/*`. Pro users get AI and advanced analytics.
