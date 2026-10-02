# Pilarweb Deployment

GitHub Actions file:

```text
.github/workflows/deploy.yaml
```

Target assumptions adapted from Itembase deployment:

```text
Domain: pilarweb.pilargroup.id
VM path: /var/www/pilarweb
Backend path: /var/www/pilarweb/backend
Frontend path: /var/www/pilarweb/frontend
PM2 app: pilarweb-api
Node on VM: 24.14.0
Frontend API base URL: /api
```

Required GitHub repository secrets:

```text
GCP_SSH_KEY
GCP_HOST
GCP_USER
```

Production backend environment file must exist on the VM at:

```text
/var/www/pilarweb/backend/.env
```

The Git workflow does not create production secrets.

The current repository contains only a frontend placeholder. The frontend build step becomes executable after the real frontend project is placed under `frontend/` with its own `package.json` and `build` script.
