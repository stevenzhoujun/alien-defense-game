# Neo Nova Defense (Neo地球防御)

A high-performance, responsive sci-fi tower defense game built with React, Tailwind CSS, and Canvas API.

## Features
- **Core Gameplay**: Defend Earth cities with 3 missile batteries.
- **Power-ups**: Shield, Hyper Missiles, Mega Blast, and Tri-Shot.
- **Bilingual**: One-click switch between English and Chinese.
- **Responsive**: Optimized for both PC (mouse) and Mobile (touch).
- **Aesthetics**: Deep space theme with dreamy sci-fi visual effects.

## Deployment to GitHub & Vercel

### 1. Sync to GitHub
1. Create a new repository on [GitHub](https://github.com/new).
2. Open your terminal in the project root.
3. Run the following commands:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Neo Nova Defense v2.0"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/neo-nova-defense.git
   git push -u origin main
   ```

### 2. Deploy to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **"New Project"**.
3. Import your GitHub repository `neo-nova-defense`.
4. Vercel will automatically detect **Vite** as the framework.
5. **Environment Variables**:
   - If you use Gemini AI features, add `GEMINI_API_KEY` in the "Environment Variables" section.
6. Click **"Deploy"**.

## Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start development server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```

## Tech Stack
- **Frontend**: React 19, Vite 6
- **Styling**: Tailwind CSS 4
- **Animation**: Motion (Framer Motion)
- **Icons**: Lucide React
- **Graphics**: Canvas API
