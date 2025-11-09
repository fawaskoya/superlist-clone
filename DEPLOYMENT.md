# Deployment Guide

This guide will help you deploy TaskFlow to production for free.

## 🆓 Free Hosting Options

### 1. **Render** (Recommended)
- **Free Tier**: Yes (with limitations)
- **Database**: Free PostgreSQL included
- **Pros**: Easy setup, automatic SSL, database included
- **Cons**: Spins down after 15 minutes of inactivity (free tier)
- **Best for**: Getting started quickly

### 2. **Railway**
- **Free Tier**: Yes ($5 credit monthly)
- **Database**: PostgreSQL available
- **Pros**: Fast, no spin-down, great DX
- **Cons**: Limited free credits
- **Best for**: Active development and testing

### 3. **Fly.io**
- **Free Tier**: Yes (3 shared VMs)
- **Database**: PostgreSQL available
- **Pros**: Global distribution, persistent storage
- **Cons**: More complex setup
- **Best for**: Production apps needing global reach

## 🚀 Deploying to Render (Recommended)

### Prerequisites
1. GitHub account
2. Render account (sign up at https://render.com)

### Step 1: Prepare Your Repository
1. Push your code to GitHub
2. Make sure all changes are committed

### Step 2: Create Database on Render
1. Go to Render Dashboard → New → PostgreSQL
2. Name it `taskflow-db`
3. Select **Free** plan
4. Click "Create Database"
5. Copy the **Internal Database URL** (you'll need this)

### Step 3: Database Schema (Automatic)
The `render.yaml` configuration automatically switches from SQLite to PostgreSQL during build. The build process will:
1. Copy `prisma/schema.postgresql.prisma` to `prisma/schema.prisma`
2. Generate Prisma client for PostgreSQL
3. Run database migrations

**Note**: For local development, keep using SQLite. The production deployment automatically uses PostgreSQL.

### Step 4: Create Web Service on Render

**Option A: Using render.yaml (Recommended)**
1. Push your code to GitHub (make sure `render.yaml` is committed)
2. Go to Render Dashboard → New → Blueprint
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml` and configure everything
5. Review the configuration and click "Apply"

**Option B: Manual Setup**
1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `taskflow-app`
   - **Environment**: Node
   - **Build Command**: `npm install && cp prisma/schema.postgresql.prisma prisma/schema.prisma && npx prisma generate && npm run build && npx prisma migrate deploy`
   - **Start Command**: `npm start`
   - **Plan**: Free

### Step 5: Configure Environment Variables

**If using render.yaml**: Most variables are auto-configured. You only need to set:
- `APP_URL`: Your Render app URL (e.g., `https://your-app-name.onrender.com`)
- `OPENAI_API_KEY`: (Optional) Your OpenAI API key for AI features

**If manual setup**: Add these environment variables in Render:

```
NODE_ENV=production
PORT=10000
APP_URL=https://your-app-name.onrender.com
JWT_SECRET=<generate-a-random-string>
SESSION_SECRET=<generate-a-random-string>
DATABASE_URL=<your-postgresql-connection-string>
OPENAI_API_KEY=<your-openai-key-if-using-ai-features>
```

**Important**: 
- Replace `APP_URL` with your actual Render URL (this fixes invitation links!)
- Generate secure random strings for `JWT_SECRET` and `SESSION_SECRET` (or let Render generate them)
- `DATABASE_URL` is automatically set if using render.yaml with the database service

### Step 6: Deploy
1. Click "Create Web Service" (or "Apply" if using Blueprint)
2. Render will build and deploy your app
3. Wait for deployment to complete (5-10 minutes)
4. Your app will be available at `https://your-app-name.onrender.com`

### Step 7: Initialize Database (First Deployment Only)
After the first deployment, you need to create the database schema:

1. Go to your service → Shell (or use Render's dashboard shell)
2. Run: `npx prisma db push`
3. This will create all tables in your PostgreSQL database

**For subsequent deployments**: The schema will be managed through Prisma migrations. Create migrations locally and commit them, then they'll be applied during deployment.

## 🚂 Deploying to Railway

### Step 1: Install Railway CLI
```bash
npm i -g @railway/cli
```

### Step 2: Login and Initialize
```bash
railway login
railway init
```

### Step 3: Create PostgreSQL Database
```bash
railway add --database postgres
```

### Step 4: Set Environment Variables
```bash
railway variables set NODE_ENV=production
railway variables set APP_URL=https://your-app.up.railway.app
railway variables set JWT_SECRET=<your-secret>
railway variables set SESSION_SECRET=<your-secret>
railway variables set OPENAI_API_KEY=<your-key>
```

### Step 5: Deploy
```bash
railway up
```

## ✈️ Deploying to Fly.io

### Step 1: Install Fly CLI
```bash
curl -L https://fly.io/install.sh | sh
```

### Step 2: Login and Initialize
```bash
fly auth login
fly launch
```

### Step 3: Create PostgreSQL Database
```bash
fly postgres create --name taskflow-db
fly postgres attach taskflow-db
```

### Step 4: Set Secrets
```bash
fly secrets set JWT_SECRET=<your-secret>
fly secrets set SESSION_SECRET=<your-secret>
fly secrets set APP_URL=https://your-app.fly.dev
fly secrets set OPENAI_API_KEY=<your-key>
```

### Step 5: Deploy
```bash
fly deploy
```

## 🔧 Post-Deployment Checklist

- [ ] Set `APP_URL` environment variable to your production URL
- [ ] Verify invitation links use production URL (not localhost)
- [ ] Run database migrations
- [ ] Test user registration and login
- [ ] Test workspace creation
- [ ] Test invitation flow
- [ ] Verify WebSocket connections work
- [ ] Set up custom domain (optional)
- [ ] Configure email service for invitations (optional)

## 🐛 Troubleshooting

### Invitation links still show localhost
- Verify `APP_URL` environment variable is set correctly
- Restart your application after setting the variable
- Check that the variable doesn't have trailing slashes

### Database connection errors
- Verify `DATABASE_URL` is set correctly
- Check database is running and accessible
- For Render: Use internal database URL for free tier

### Build failures
- Check Node.js version compatibility
- Verify all dependencies are in `package.json`
- Check build logs for specific errors

### WebSocket issues
- Verify WebSocket is enabled on your hosting platform
- Check firewall settings
- Some free tiers may have WebSocket limitations

## 📝 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `PORT` | Yes | Server port | `3000` or `10000` |
| `APP_URL` | Yes (Prod) | Your app's public URL | `https://your-app.com` |
| `JWT_SECRET` | Yes | Secret for JWT tokens | Random string |
| `SESSION_SECRET` | Yes | Secret for sessions | Random string |
| `DATABASE_URL` | Yes | Database connection string | `postgresql://...` |
| `OPENAI_API_KEY` | No | OpenAI API key for AI features | `sk-...` |

## 🔒 Security Notes

1. **Never commit `.env` files** to Git
2. **Use strong, random secrets** for `JWT_SECRET` and `SESSION_SECRET`
3. **Enable HTTPS** (automatically handled by Render/Railway/Fly.io)
4. **Keep dependencies updated** for security patches
5. **Use environment variables** for all secrets

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Fly.io Documentation](https://fly.io/docs)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)

## 🆘 Need Help?

If you encounter issues:
1. Check the deployment logs
2. Verify all environment variables are set
3. Ensure database migrations have run
4. Check that your build completes successfully

