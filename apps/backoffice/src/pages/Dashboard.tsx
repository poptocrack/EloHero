import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminService } from '@/services/admin';
import { Users, UsersRound, Gamepad2, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import { getUserClaims, isAdmin } from '@/lib/auth-utils';
import { auth } from '@/lib/firebase';

interface Stats {
  totalUsers: number;
  totalGroups: number;
  totalGames: number;
  totalMembers: number;
  activeSubscriptions: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminStatus, setAdminStatus] = useState<boolean | null>(null);
  const [claims, setClaims] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const userClaims = await getUserClaims();
        setClaims(userClaims);
        const hasAdmin = await isAdmin();
        setAdminStatus(hasAdmin);
        
        if (!hasAdmin) {
          setError('You do not have admin access. Please ensure: 1) Admin claim is set on your account, 2) You have signed out and signed back in, 3) Firestore rules are deployed.');
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Failed to verify admin status');
      }
    };

    checkAdminStatus();
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      if (adminStatus === false) {
        setLoading(false);
        return;
      }

      try {
        const data = await AdminService.getStats();
        setStats(data);
        setError(null);
      } catch (error) {
        console.error('Failed to load stats:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('permission') || errorMessage.includes('insufficient')) {
          setError('Permission denied. Please verify: 1) Admin claim is set, 2) You have re-authenticated, 3) Firestore rules are deployed.');
        } else {
          setError(`Failed to load stats: ${errorMessage}`);
        }
      } finally {
        setLoading(false);
      }
    };

    if (adminStatus !== null) {
      loadStats();
    }
  }, [adminStatus]);

  if (loading) {
    return <div className="text-lg">Loading dashboard...</div>;
  }

  // Show admin status debug info in development
  const isDevelopment = import.meta.env.DEV;
  const showDebugInfo = isDevelopment && (adminStatus === false || error);

  const getStatCards = (statsData: Stats) => [
    {
      title: 'Total Users',
      value: statsData.totalUsers,
      description: 'Registered users',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Groups',
      value: statsData.totalGroups,
      description: 'Active groups',
      icon: UsersRound,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Games',
      value: statsData.totalGames,
      description: 'Games played',
      icon: Gamepad2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Total Members',
      value: statsData.totalMembers,
      description: 'Group memberships',
      icon: UsersRound,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Active Subscriptions',
      value: statsData.activeSubscriptions,
      description: 'Premium users',
      icon: CreditCard,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
    },
  ];

  return (
    <div className="space-y-8">
      {showDebugInfo && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-5 w-5" />
              Admin Access Debug Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-yellow-800">Admin Status:</p>
              <p className="text-sm text-yellow-700">
                {adminStatus === true ? '✅ Admin access granted' : '❌ Admin access not found'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-800">User Claims:</p>
              <pre className="mt-1 rounded bg-yellow-100 p-2 text-xs text-yellow-900 overflow-auto">
                {JSON.stringify(claims, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-800">User Email:</p>
              <p className="text-sm text-yellow-700">{auth.currentUser?.email || 'Not available'}</p>
            </div>
            {error && (
              <div>
                <p className="text-sm font-medium text-yellow-800">Error:</p>
                <p className="text-sm text-yellow-700">{error}</p>
              </div>
            )}
            <div className="mt-4 rounded bg-yellow-100 p-3">
              <p className="text-sm font-medium text-yellow-800">To fix this:</p>
              <ol className="mt-2 list-decimal list-inside space-y-1 text-sm text-yellow-700">
                <li>Run: <code className="bg-yellow-200 px-1 rounded">node set-admin-with-key.js {auth.currentUser?.email || 'your-email'} ./service-account-key.json</code></li>
                <li>Deploy Firestore rules: <code className="bg-yellow-200 px-1 rounded">firebase deploy --only firestore:rules</code></li>
                <li>Sign out and sign back in to refresh your token</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {error && !showDebugInfo && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {!stats && !error && (
        <div className="text-lg text-destructive">Failed to load statistics</div>
      )}

      {stats && (
        <>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600">Overview of your EloHero platform</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {getStatCards(stats).map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`rounded-full p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center space-x-2 rounded-lg border p-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Platform Growth</p>
                <p className="text-xs text-muted-foreground">Monitor user acquisition</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}

