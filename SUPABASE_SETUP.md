# Supabase Connection Setup for Render

## Issue
Render (serverless) cannot directly connect to Supabase on port 5432. You need to use Supabase's **Connection Pooler** on port **6543**.

## Steps to Fix

### 1. Get Connection Pooler URL from Supabase Dashboard

1. Go to your Supabase project: https://supabase.com/dashboard
2. Select your project: `mvudlnvicmikconnlrrb`
3. Go to **Settings** → **Database**
4. Scroll to **Connection string** section
5. Click on **Connection pooling** tab
6. Select **Session mode** (required for Prisma)
7. Copy the connection string - it should look like:
   ```
   postgresql://postgres.mvudlnvicmikconnlrrb:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
8. Replace `[YOUR-PASSWORD]` with `Master123`
9. The final URL should be:
   ```
   postgresql://postgres.mvudlnvicmikconnlrrb:Master123@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

### 2. Update render.yaml

Replace the `DATABASE_URL` in `render.yaml` with the connection pooler URL you copied.

### 3. Configure IP Restrictions (IMPORTANT)

1. In Supabase Dashboard → **Settings** → **Database**
2. Scroll to **Network Restrictions**
3. Make sure **IPv4** is set to allow connections:
   - Option 1: Allow all IPs (for testing): `0.0.0.0/0`
   - Option 2: Use Supabase's recommended settings for production
4. Click **Save**

### 4. Verify Database is Running

1. In Supabase Dashboard, check that your database status shows **"Healthy"**
2. If it shows "Paused", click **"Resume"** button

### 5. Test Connection

After updating `render.yaml`, redeploy on Render and test the connection.

## Common Issues

### "Can't reach database server"
- **Solution**: Make sure you're using the connection pooler URL (port 6543) not direct connection (port 5432)
- **Solution**: Check IP restrictions in Supabase settings
- **Solution**: Verify database is running (not paused)

### "Authentication failed"
- **Solution**: Verify password is correct in connection string
- **Solution**: Make sure you're using the pooler URL format (postgres.[PROJECT-REF] not just postgres)

### Connection timeouts
- **Solution**: Use Session mode pooler (port 6543) for Prisma
- **Solution**: Check Supabase project status

## Direct Connection vs Connection Pooler

- **Direct Connection** (port 5432): For local development, migrations, one-off scripts
- **Connection Pooler** (port 6543): For serverless environments like Render, production apps

For Render deployment, you **MUST** use the connection pooler.

