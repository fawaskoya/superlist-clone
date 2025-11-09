# Quick Deployment Guide

## 🎯 Quick Answer: Invitation Links

**Yes, invitation links will automatically use your production URL when you deploy!**

The app uses the `APP_URL` environment variable to generate invitation links. When deployed:
- Set `APP_URL=https://your-production-domain.com` in your hosting platform
- All invitation links will use this URL instead of localhost

## 🚀 Fastest Way to Deploy (Render - 5 minutes)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push
   ```

2. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub

3. **Deploy with Blueprint**
   - Click "New" → "Blueprint"
   - Connect your GitHub repo
   - Render will auto-detect `render.yaml`
   - Click "Apply"

4. **Set Environment Variables**
   - Go to your service → Environment
   - Set `APP_URL` to your Render URL (e.g., `https://your-app.onrender.com`)
   - Set `OPENAI_API_KEY` if using AI features (optional)

5. **Wait for Deployment**
   - First deployment takes 5-10 minutes
   - Your app will be live at your Render URL

## ✅ That's It!

Your app is now live with:
- ✅ Production URLs for invitation links
- ✅ PostgreSQL database
- ✅ Automatic SSL/HTTPS
- ✅ Free hosting (with limitations)

## 📚 Full Documentation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Detailed step-by-step instructions
- Alternative hosting options (Railway, Fly.io)
- Troubleshooting guide
- Security best practices

## 🔧 Local Development

For local development, keep using SQLite:
- The `prisma/schema.prisma` uses SQLite by default
- Production automatically switches to PostgreSQL during build
- No changes needed to your local setup!

## ❓ Common Questions

**Q: Will invitation links work in production?**  
A: Yes! Just set the `APP_URL` environment variable to your production domain.

**Q: Do I need to change the database schema?**  
A: No! The build process automatically switches to PostgreSQL for production.

**Q: Is it really free?**  
A: Yes, Render's free tier includes:
- Web service (spins down after 15 min inactivity)
- PostgreSQL database (90 days free, then $7/month)
- Automatic SSL/HTTPS

**Q: Can I use a custom domain?**  
A: Yes! Render supports custom domains on free tier.

