# Job Scout Deployment Guide

## Environment Setup

### Frontend (Vercel/Render)

Set the following environment variable in your deployment platform:

```
VITE_API_URL=https://your-backend-url.onrender.com/api/v1
```

**For Vercel:**
1. Go to your project settings
2. Navigate to Environment Variables
3. Add `VITE_API_URL` with your backend URL

**For Render:**
1. Go to your web service
2. Navigate to Environment
3. Add `VITE_API_URL` with your backend URL

### Backend (Render)

Required environment variables:
```
NODE_ENV=production
MONGO_URI=your_mongodb_connection_string
COHERE_API_KEY=your_cohere_api_key
PORT=8000
```

## Quick Fix for Current Deployment

If your frontend is already deployed on Vercel at `https://job-scout-chi.vercel.app`:

1. **Deploy the backend** to Render (if not done already)
2. **Note your backend URL** (e.g., `https://job-scout-backend.onrender.com`)
3. **Update frontend environment variable** in Vercel:
   - Go to Vercel project settings
   - Environment Variables → Add
   - Key: `VITE_API_URL`
   - Value: `https://your-backend-url.onrender.com/api/v1`
4. **Redeploy frontend** to apply the changes

## CORS Configuration

The backend is configured to accept requests from:
- `http://localhost:5173` (local development)
- `https://job-scout-chi.vercel.app` (production)
- Any origin in development mode

Update `job-scout-backend/index.js` to add more allowed origins if needed.
