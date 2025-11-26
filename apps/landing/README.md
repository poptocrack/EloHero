# EloHero Landing Page

A modern landing page for EloHero built with React, TypeScript, Vite, and Tailwind CSS.

## Development

```bash
# From the root directory
yarn dev:landing

# Or from this directory
yarn dev
```

The app will be available at `http://localhost:3002`

## Build

```bash
yarn build
```

The build output will be in the `dist/` directory.

## Netlify Deployment

### Setup Instructions

1. **Connect your repository to Netlify:**
   - Go to your Netlify dashboard
   - Click "Add new site" → "Import an existing project"
   - Connect your Git repository

2. **Configure build settings:**
   - **Base directory:** `apps/landing`
   - **Build command:** `yarn build` (or `cd apps/landing && yarn build`)
   - **Publish directory:** `apps/landing/dist`

3. **Environment variables (if needed):**
   - Add any required environment variables in Netlify's site settings

4. **Custom domain:**
   - Go to Site settings → Domain management
   - Add your custom domain
   - Follow Netlify's DNS configuration instructions

### Netlify Configuration

The `netlify.toml` file is already configured with:
- Build command and publish directory
- SPA redirect rules (all routes redirect to `index.html` for client-side routing)

### Manual Deployment

You can also deploy manually using the Netlify CLI:

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Build the project
yarn build

# Deploy
cd apps/landing
netlify deploy --prod --dir=dist
```

## Project Structure

```
apps/landing/
├── public/          # Static assets
├── src/            # Source code
│   ├── App.tsx     # Main app component
│   ├── main.tsx    # Entry point
│   └── index.css   # Global styles
├── index.html      # HTML template
├── netlify.toml    # Netlify configuration
├── package.json    # Dependencies
├── tsconfig.json   # TypeScript config
└── vite.config.ts  # Vite configuration
```

