# EloHero Admin Backoffice

A modern admin interface built with React, Vite, TypeScript, and shadcn/ui for managing the EloHero platform.

## Features

- **Dashboard**: Overview statistics and platform metrics
- **Users Management**: View and manage all registered users
- **Groups Management**: Monitor and manage all groups
- **Games Management**: View all games played across the platform
- **Members Management**: Track group memberships
- **Seasons Management**: View all seasons across groups
- **Subscriptions Management**: Monitor user subscriptions

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **shadcn/ui** - UI component library
- **Firebase** - Authentication and Firestore
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **date-fns** - Date formatting

## Getting Started

### Prerequisites

- Node.js 18+ and Yarn
- Firebase project configured
- Environment variables set up

### Installation

1. Install dependencies (from root):
```bash
yarn install
```

2. Set up environment variables:

Create a `.env` file in the `apps/backoffice` directory or use the root `.env` file with these variables:

```env
# Firebase Configuration (use VITE_ prefix for Vite)
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-firebase-app-id

# Or use EXPO_PUBLIC_ prefix (will also work)
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id
```

### Running the Development Server

From the root directory:
```bash
yarn dev:backoffice
```

Or from the backoffice directory:
```bash
cd apps/backoffice
yarn dev
```

The app will be available at `http://localhost:3001`

### Building for Production

```bash
yarn workspace @elohero/backoffice build
```

The built files will be in `apps/backoffice/dist`

## Authentication

The backoffice uses Firebase Authentication. You'll need to:

1. Create an admin user in Firebase Authentication
2. Sign in with email/password on the login page
3. Ensure your Firestore security rules allow admin access (or use Firebase Admin SDK for admin operations)

## Project Structure

```
apps/backoffice/
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn/ui components
│   │   └── Layout.tsx   # Main layout with sidebar
│   ├── lib/
│   │   ├── firebase.ts  # Firebase initialization
│   │   └── utils.ts    # Utility functions
│   ├── pages/           # Admin pages
│   │   ├── Dashboard.tsx
│   │   ├── Users.tsx
│   │   ├── Groups.tsx
│   │   ├── Games.tsx
│   │   ├── Members.tsx
│   │   ├── Seasons.tsx
│   │   ├── Subscriptions.tsx
│   │   └── Login.tsx
│   ├── services/
│   │   └── admin.ts     # Admin service for data fetching
│   ├── App.tsx          # Main app component with routing
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Features Overview

### Dashboard
- Total users count
- Total groups count
- Total games count
- Total members count
- Active subscriptions count

### Users Page
- List all registered users
- Search by name or user ID
- View user plan (free/premium)
- View subscription status
- View groups count

### Groups Page
- List all groups
- Search by name, ID, or invitation code
- View member count and game count
- View group status (active/inactive)
- View owner information

### Games Page
- List all games played
- Search by game ID, group ID, or season ID
- View game type and status
- View creation date

### Members Page
- List all group memberships
- Search by name, user ID, or group ID
- View membership status
- View join date

### Seasons Page
- List all seasons
- Search by name, season ID, or group ID
- View season status (active/inactive)
- View game count and dates

### Subscriptions Page
- List all subscriptions
- Search by user ID, plan, or status
- View subscription period
- View subscription status

## Development

### Adding New Pages

1. Create a new page component in `src/pages/`
2. Add a route in `src/App.tsx`
3. Add navigation item in `src/components/Layout.tsx`
4. Add data fetching methods in `src/services/admin.ts` if needed

### Styling

The project uses Tailwind CSS with shadcn/ui components. All components follow the design system defined in the workspace rules.

## License

Private - EloHero Platform


