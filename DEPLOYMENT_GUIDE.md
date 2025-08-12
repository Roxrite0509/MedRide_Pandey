# EmergencyConnect - Complete Deployment Guide
## Railway Backend + Vercel Frontend Deployment

This guide will walk you through deploying your EmergencyConnect application with the backend on Railway.com and frontend on Vercel.com.

---

## Part 1: Download Your Project as ZIP

### Step 1: Download from Replit
1. **Open your Replit project**
2. **Click the three dots menu** (⋯) in the top-right corner of your Replit workspace
3. **Select "Download as zip"** from the dropdown menu
4. **Save the zip file** to your computer (e.g., `EmergencyConnect.zip`)
5. **Extract the zip file** to a folder on your computer

### Step 2: Prepare Local Environment
1. **Open Terminal/Command Prompt** on your computer
2. **Navigate to your project folder**:
   ```bash
   cd path/to/EmergencyConnect
   ```
3. **Install Node.js** (if not already installed):
   - Visit https://nodejs.org/
   - Download and install the LTS version
4. **Install project dependencies**:
   ```bash
   npm install
   ```

---

## Part 2: Backend Deployment on Railway.com

### Step 1: Create Railway Account
1. **Visit** https://railway.app/
2. **Click "Login"** in the top-right corner
3. **Sign up with GitHub** (recommended) or email
4. **Verify your account** through email if needed

### Step 2: Create New Railway Project
1. **Click "New Project"** on your Railway dashboard
2. **Select "Deploy from GitHub repo"**
3. **Connect your GitHub account** if not already connected
4. **Create a new GitHub repository**:
   - Go to https://github.com/new
   - Repository name: `emergency-connect-backend`
   - Make it **Public** (or Private if you have a paid GitHub plan)
   - Click "Create repository"

### Step 3: Upload Your Code to GitHub
1. **In your local project folder**, open terminal
2. **Initialize Git repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - EmergencyConnect backend"
   ```
3. **Add your GitHub repository**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/emergency-connect-backend.git
   git branch -M main
   git push -u origin main
   ```

### Step 4: Deploy on Railway
1. **Back in Railway**, select your GitHub repository
2. **Railway will automatically detect** your Node.js project
3. **Click "Deploy"**
4. **Wait for deployment** (usually 2-3 minutes)

### Step 5: Configure Environment Variables on Railway
1. **Click on your deployed service** in Railway dashboard
2. **Go to "Variables" tab**
3. **Add these environment variables** one by one:

   ```
   DATABASE_URL=postgresql://neondb_owner:npg_g1ET2bjFyHcB@ep-frosty-math-a1319f86-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   
   JWT_SECRET=emergency-connect-production-secret-key-2025-very-secure
   
   NODE_ENV=production
   
   PORT=5000
   
   GOOGLE_MAPS_API_KEY=AIzaSyCgJVVmQYxX3U6Z6qpw3MlRfkrULORJR_c
   ```

4. **Click "Add" for each variable**
5. **Railway will automatically redeploy** after adding variables

### Step 6: Get Your Railway Backend URL
1. **In Railway dashboard**, click on your service
2. **Go to "Settings" tab**
3. **Scroll down to "Domains"**
4. **Copy the generated URL** (looks like: `https://your-app-name.railway.app`)
5. **Save this URL** - you'll need it for frontend deployment

---

## Part 3: Frontend Deployment on Vercel.com

### Step 1: Create Vercel Account
1. **Visit** https://vercel.com/
2. **Click "Sign Up"**
3. **Sign up with GitHub** (recommended)
4. **Complete account setup**

### Step 2: Prepare Frontend for Deployment
1. **Create a separate GitHub repository** for frontend:
   - Go to https://github.com/new
   - Repository name: `emergency-connect-frontend`
   - Make it **Public**
   - Click "Create repository"

2. **Create a new folder** on your computer called `emergency-connect-frontend`
3. **Copy these folders/files** from your main project to the frontend folder:
   ```
   client/
   package.json
   package-lock.json
   vite.config.ts
   tsconfig.json
   tailwind.config.ts
   postcss.config.js
   components.json
   ```

4. **Create a new package.json** specifically for frontend in the frontend folder:
   ```json
   {
     "name": "emergency-connect-frontend",
     "version": "1.0.0",
     "type": "module",
     "scripts": {
       "dev": "vite",
       "build": "vite build",
       "preview": "vite preview"
     },
     "dependencies": {
       // Copy all dependencies from your main package.json
     }
   }
   ```

### Step 3: Configure Frontend Environment
1. **In your frontend folder**, create `.env.local` file:
   ```
   VITE_API_URL=https://your-railway-app.railway.app
   ```
   (Replace with your actual Railway URL from Step 6 above)

### Step 4: Upload Frontend to GitHub
1. **In your frontend folder**, open terminal
2. **Initialize and push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - EmergencyConnect frontend"
   git remote add origin https://github.com/YOUR_USERNAME/emergency-connect-frontend.git
   git branch -M main
   git push -u origin main
   ```

### Step 5: Deploy on Vercel
1. **In Vercel dashboard**, click "New Project"
2. **Import your frontend repository** from GitHub
3. **Configure project settings**:
   - Framework Preset: **Vite**
   - Root Directory: **Leave blank**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Add Environment Variables**:
   - Click "Environment Variables"
   - Add: `VITE_API_URL` = `https://your-railway-app.railway.app`

5. **Click "Deploy"**
6. **Wait for deployment** (usually 1-2 minutes)

---

## Part 4: Testing Your Deployment

### Step 1: Test Backend
1. **Visit your Railway URL** in browser
2. **Test health endpoint**: `https://your-railway-app.railway.app/api/health`
3. **Should return**: JSON with status "healthy"

### Step 2: Test Frontend
1. **Visit your Vercel URL** in browser
2. **Test login page** loads properly
3. **Test registration** by creating a new account
4. **Test login** with existing credentials:
   - Username: `patient1`
   - Password: `password123`

### Step 3: Test Integration
1. **Try logging in** on your Vercel frontend
2. **Create an emergency request** as patient
3. **Verify real-time updates** work properly

---

## Part 5: Post-Deployment Configuration

### Important URLs to Save:
- **Backend (Railway)**: `https://your-app-name.railway.app`
- **Frontend (Vercel)**: `https://your-app-name.vercel.app`
- **Admin Dashboard**: `https://your-app-name.vercel.app/admin`

### Admin Access:
- **Username**: `admin`
- **Password**: `admin123`

### Test Accounts:
- **Patient**: username=`patient1`, password=`password123`
- **Apollo Hospital**: username=`apollo_admin`, password=`password123`
- **Ambulance**: username=`ambulance1`, password=`password123`

---

## Part 6: Troubleshooting Common Issues

### Backend Issues:
1. **500 Error**: Check Railway logs in dashboard
2. **Database Connection**: Verify DATABASE_URL is correct
3. **Environment Variables**: Ensure all variables are set in Railway

### Frontend Issues:
1. **Blank Page**: Check browser console for errors
2. **API Errors**: Verify VITE_API_URL points to Railway backend
3. **Build Failures**: Check Vercel deployment logs

### CORS Issues:
- Backend is configured to accept requests from any origin
- If issues persist, check Railway logs for specific errors

---

## Part 7: Monitoring and Maintenance

### Railway Monitoring:
- Check **"Metrics" tab** for resource usage
- Monitor **"Logs" tab** for error messages
- Set up **alerts** for downtime

### Vercel Monitoring:
- Check **"Functions" tab** for performance
- Monitor **"Analytics" tab** for usage
- Review **deployment logs** for build issues

### Database Monitoring:
- Monitor Neon PostgreSQL dashboard
- Check connection limits and usage
- Set up backup schedules if needed

---

## Congratulations! 

Your EmergencyConnect application is now deployed with:
- ✅ Backend running on Railway.com
- ✅ Frontend running on Vercel.com
- ✅ Database hosted on Neon PostgreSQL
- ✅ Real-time WebSocket communication
- ✅ Complete emergency response system

Your application is production-ready and accessible worldwide!