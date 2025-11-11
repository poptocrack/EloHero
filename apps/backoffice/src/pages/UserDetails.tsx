import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminService } from '@/services/admin';
import type { User, Group, Rating } from '@elohero/shared-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Loader2, ArrowLeft, Crown } from 'lucide-react';

interface UserGroupWithRating extends Group {
  rating?: Rating;
  joinedAt?: Date;
}

export default function UserDetails() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userGroups, setUserGroups] = useState<UserGroupWithRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    const loadUserDetails = async () => {
      if (!userId) {
        navigate('/users');
        return;
      }

      setLoading(true);
      try {
        // Fetch user
        const fetchedUser = await AdminService.getUser(userId);
        if (!fetchedUser) {
          navigate('/users');
          return;
        }
        setUser(fetchedUser);

        // Load user's groups and ratings
        const [groups, ratings] = await Promise.all([
          AdminService.getUserGroups(userId),
          AdminService.getUserRatings(userId),
        ]);

        // Match groups with their ratings
        const groupsWithRatings: UserGroupWithRating[] = groups.map((group) => {
          // Find rating for current season if available
          const groupRating = ratings.find(
            (r) => r.groupId === group.id && r.seasonId === group.currentSeasonId
          );
          return {
            ...group,
            rating: groupRating,
          };
        });

        setUserGroups(groupsWithRatings);
      } catch (error) {
        console.error('Failed to load user details:', error);
        navigate('/users');
      } finally {
        setLoading(false);
      }
    };

    loadUserDetails();
  }, [userId, navigate]);

  const handleUpgradeToPremium = async () => {
    if (!user || !confirm('Are you sure you want to upgrade this user to premium?')) {
      return;
    }

    setUpgrading(true);
    try {
      await AdminService.upgradeUserToPremium(user.uid);
      // Reload user data
      const updatedUser = await AdminService.getUser(user.uid);
      if (updatedUser) {
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to upgrade user:', error);
      alert(`Failed to upgrade user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUpgrading(false);
    }
  };

  const handleDowngradeToFree = async () => {
    if (!user || !confirm('Are you sure you want to downgrade this user to free?')) {
      return;
    }

    setUpgrading(true);
    try {
      await AdminService.downgradeUserToFree(user.uid);
      // Reload user data
      const updatedUser = await AdminService.getUser(user.uid);
      if (updatedUser) {
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to downgrade user:', error);
      alert(`Failed to downgrade user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading user details...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-4">User not found</p>
          <Button onClick={() => navigate('/users')}>Back to Users</Button>
        </div>
      </div>
    );
  }

  const isPremium = user.plan === 'premium';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/users')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{user.displayName}</h1>
            <p className="text-sm text-muted-foreground font-mono mt-1">{user.uid}</p>
          </div>
        </div>
        <div>
          {isPremium ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDowngradeToFree}
              disabled={upgrading}
            >
              {upgrading ? (
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
              onClick={handleUpgradeToPremium}
              disabled={upgrading}
            >
              {upgrading ? (
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Account details and subscription information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Display Name</p>
                <p className="text-base font-semibold">{user.displayName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Plan</p>
                <Badge variant={isPremium ? 'default' : 'secondary'} className="mt-1">
                  {user.plan}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Groups Count</p>
                <p className="text-base">{user.groupsCount}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Joined</p>
                <p className="text-base">{format(user.createdAt, 'MMM d, yyyy HH:mm')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-base">{format(user.updatedAt, 'MMM d, yyyy HH:mm')}</p>
              </div>
              {user.subscriptionStatus && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Subscription Status</p>
                  <Badge
                    variant={user.subscriptionStatus === 'active' ? 'success' : 'destructive'}
                    className="mt-1"
                  >
                    {user.subscriptionStatus}
                  </Badge>
                </div>
              )}
              {user.subscriptionStartDate && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Subscription Start</p>
                  <p className="text-base">{format(user.subscriptionStartDate, 'MMM d, yyyy')}</p>
                </div>
              )}
              {user.subscriptionEndDate && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Subscription End</p>
                  <p className="text-base">{format(user.subscriptionEndDate, 'MMM d, yyyy')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Summary of user activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Groups</span>
                <span className="text-2xl font-bold">{userGroups.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Active Groups</span>
                <span className="text-2xl font-bold">
                  {userGroups.filter((g) => g.isActive).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Groups with Ratings</span>
                <span className="text-2xl font-bold">
                  {userGroups.filter((g) => g.rating).length}
                </span>
              </div>
              {userGroups.some((g) => g.rating) && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Average Elo</span>
                  <span className="text-2xl font-bold">
                    {Math.round(
                      userGroups
                        .filter((g) => g.rating)
                        .reduce((sum, g) => sum + (g.rating?.currentRating || 0), 0) /
                        userGroups.filter((g) => g.rating).length
                    )}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Groups and Elos */}
      <Card>
        <CardHeader>
          <CardTitle>Groups & Elo Ratings</CardTitle>
          <CardDescription>
            {userGroups.length === 0
              ? 'User is not a member of any groups'
              : `${userGroups.length} group${userGroups.length > 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userGroups.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No groups found</p>
          ) : (
            <div className="space-y-4">
              {userGroups.map((group) => (
                <div key={group.id} className="border rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold">{group.name}</h4>
                      <p className="text-sm text-muted-foreground font-mono mt-1">{group.id}</p>
                    </div>
                    <Badge variant={group.isActive ? 'success' : 'destructive'}>
                      {group.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Members</p>
                      <p className="text-base font-semibold">{group.memberCount}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Games</p>
                      <p className="text-base font-semibold">{group.gameCount}</p>
                    </div>
                    {group.rating ? (
                      <>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Current Elo</p>
                          <p className="text-2xl font-bold text-primary">
                            {Math.round(group.rating.currentRating)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Games Played</p>
                          <p className="text-base font-semibold">{group.rating.gamesPlayed}</p>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">
                          No rating data available for current season
                        </p>
                      </div>
                    )}
                  </div>
                  {group.rating && (
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Wins</p>
                        <p className="text-base font-semibold text-green-600">
                          {group.rating.wins}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Losses</p>
                        <p className="text-base font-semibold text-red-600">
                          {group.rating.losses}
                        </p>
                      </div>
                      {group.rating.draws > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Draws</p>
                          <p className="text-base font-semibold">{group.rating.draws}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

