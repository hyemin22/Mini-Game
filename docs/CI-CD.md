# CI/CD

## Pipeline

`.github/workflows/pipeline.yml` runs on pull requests and every branch push.
It installs dependencies with `npm ci`, checks every server-side JavaScript file,
starts the server on a random port, and verifies `GET /healthz`.

Production deployment runs after validation when a commit is pushed to `main`.
It triggers the Render backend and Vercel frontend deployment hooks.

## GitHub setup

Create these repository secrets, or environment secrets under the `production`
environment:

- `RENDER_DEPLOY_HOOK_URL`: Render service Deploy Hook URL
- `VERCEL_DEPLOY_HOOK_URL`: Vercel project Deploy Hook URL

The Render service can be created from `render.yaml`. Set the following Render
environment variables in the service dashboard:

- `KOREAN_DICT_API_KEY`
- `FRONTEND_URL`
- `DEVELOPER_PHONE` (optional)

The Vercel project should use `public` as its output directory because the
frontend is a static site with no build step.
