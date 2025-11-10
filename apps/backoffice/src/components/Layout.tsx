import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  LayoutDashboard,
  Users as UsersIcon,
  UsersRound,
  Gamepad2,
  Calendar,
  CreditCard,
  LogOut,
  Trophy,
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Users', href: '/users', icon: UsersIcon },
  { name: 'Groups', href: '/groups', icon: UsersRound },
  { name: 'Games', href: '/games', icon: Gamepad2 },
  { name: 'Members', href: '/members', icon: UsersRound },
  { name: 'Seasons', href: '/seasons', icon: Calendar },
  { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="flex w-64 flex-col bg-white border-r border-gray-200">
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="ml-2 text-xl font-bold text-gray-900">EloHero Admin</h1>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-200 p-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-700 hover:bg-gray-100"
            onClick={handleSignOut}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}

