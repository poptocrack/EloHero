import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminService } from '@/services/admin';
import type { User } from '@elohero/shared-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Crown, Loader2 } from 'lucide-react';

export default function Users() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [upgradingUsers, setUpgradingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await AdminService.getUsers();
        setUsers(data);
        setFilteredUsers(data);
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users);
      // Remove search param if empty
      if (searchParams.get('search')) {
        setSearchParams((prev) => {
          prev.delete('search');
          return prev;
        });
      }
      return;
    }

    const filtered = users.filter(
      (user) =>
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.uid.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users, searchParams, setSearchParams]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setSearchParams((prev) => {
      if (value) {
        prev.set('search', value);
      } else {
        prev.delete('search');
      }
      return prev;
    });
  };

  const handleUpgradeToPremium = async (uid: string) => {
    if (!confirm('Are you sure you want to upgrade this user to premium?')) {
      return;
    }

    setUpgradingUsers((prev) => new Set(prev).add(uid));

    try {
      await AdminService.upgradeUserToPremium(uid);
      // Reload users to reflect the change
      const updatedUsers = await AdminService.getUsers();
      setUsers(updatedUsers);
      setFilteredUsers(updatedUsers);
    } catch (error) {
      console.error('Failed to upgrade user:', error);
      alert(`Failed to upgrade user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUpgradingUsers((prev) => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
    }
  };

  const handleDowngradeToFree = async (uid: string) => {
    if (!confirm('Are you sure you want to downgrade this user to free?')) {
      return;
    }

    setUpgradingUsers((prev) => new Set(prev).add(uid));

    try {
      await AdminService.downgradeUserToFree(uid);
      // Reload users to reflect the change
      const updatedUsers = await AdminService.getUsers();
      setUsers(updatedUsers);
      setFilteredUsers(updatedUsers);
    } catch (error) {
      console.error('Failed to downgrade user:', error);
      alert(`Failed to downgrade user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUpgradingUsers((prev) => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
    }
  };

  if (loading) {
    return <div className="text-lg">Loading users...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>
        <p className="mt-2 text-sm text-gray-600">Manage all registered users</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>A list of all users in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Groups</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const isUpgrading = upgradingUsers.has(user.uid);
                  const isPremium = user.plan === 'premium';

                  return (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">{user.displayName}</TableCell>
                      <TableCell className="font-mono text-xs">{user.uid}</TableCell>
                      <TableCell>
                        <Badge variant={isPremium ? 'default' : 'secondary'}>
                          {user.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.groupsCount}</TableCell>
                      <TableCell>
                        {user.subscriptionStatus ? (
                          <Badge
                            variant={
                              user.subscriptionStatus === 'active' ? 'success' : 'destructive'
                            }
                          >
                            {user.subscriptionStatus}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(user.createdAt, 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {isPremium ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDowngradeToFree(user.uid)}
                            disabled={isUpgrading}
                          >
                            {isUpgrading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              'Downgrade to Free'
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleUpgradeToPremium(user.uid)}
                            disabled={isUpgrading}
                          >
                            {isUpgrading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Crown className="mr-2 h-4 w-4" />
                                Upgrade to Premium
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

