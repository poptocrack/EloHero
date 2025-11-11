import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminService } from '@/services/admin';
import type { Group, Member, Season, Game, Rating, User } from '@elohero/shared-types';
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
import { Loader2, ArrowLeft } from 'lucide-react';

interface MemberWithRating extends Member {
  rating?: Rating;
  user?: User;
}

export default function GroupDetails() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<MemberWithRating[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [owner, setOwner] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGroupDetails = async () => {
      if (!groupId) {
        navigate('/groups');
        return;
      }

      setLoading(true);
      try {
        // Fetch group
        const fetchedGroup = await AdminService.getGroup(groupId);
        if (!fetchedGroup) {
          navigate('/groups');
          return;
        }
        setGroup(fetchedGroup);

        // Load owner
        if (fetchedGroup.ownerId) {
          const ownerData = await AdminService.getUser(fetchedGroup.ownerId);
          setOwner(ownerData);
        }

        // Load all related data in parallel
        const [membersData, seasonsData, gamesData] = await Promise.all([
          AdminService.getGroupMembers(groupId),
          AdminService.getGroupSeasons(groupId),
          AdminService.getGroupGames(groupId),
        ]);

        setSeasons(seasonsData);
        setGames(gamesData);

        // Find current season
        const activeSeason = seasonsData.find((s) => s.isActive) || seasonsData[0] || null;
        setCurrentSeason(activeSeason);

        // Load ratings for current season if available
        let ratings: Rating[] = [];
        if (activeSeason) {
          ratings = await AdminService.getSeasonRatings(activeSeason.id);
        }

        // Match members with their ratings and user data
        const membersWithRatings: MemberWithRating[] = await Promise.all(
          membersData.map(async (member) => {
            const rating = ratings.find((r) => r.uid === member.uid);
            let user: User | null = null;
            try {
              user = await AdminService.getUser(member.uid);
            } catch (error) {
              // User might not exist, that's okay
            }
            return {
              ...member,
              rating,
              user,
            };
          })
        );

        // Sort by rating if available, otherwise by name
        membersWithRatings.sort((a, b) => {
          const ratingA = a.rating?.currentRating || 0;
          const ratingB = b.rating?.currentRating || 0;
          if (ratingB !== ratingA) {
            return ratingB - ratingA;
          }
          return a.displayName.localeCompare(b.displayName);
        });

        setMembers(membersWithRatings);
      } catch (error) {
        console.error('Failed to load group details:', error);
        navigate('/groups');
      } finally {
        setLoading(false);
      }
    };

    loadGroupDetails();
  }, [groupId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading group details...</span>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-4">Group not found</p>
          <Button onClick={() => navigate('/groups')}>Back to Groups</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/groups')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Groups
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
            <p className="text-sm text-muted-foreground font-mono mt-1">{group.id}</p>
          </div>
        </div>
        <Badge variant={group.isActive ? 'success' : 'destructive'} className="text-sm px-3 py-1">
          {group.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Group Information */}
        <Card>
          <CardHeader>
            <CardTitle>Group Information</CardTitle>
            <CardDescription>Group details and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-base font-semibold">{group.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={group.isActive ? 'success' : 'destructive'} className="mt-1">
                  {group.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {group.description && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-base">{group.description}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Owner</p>
                <p className="text-base">{owner?.displayName || group.ownerId}</p>
                <p className="text-xs text-muted-foreground font-mono">{group.ownerId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Invitation Code</p>
                <p className="text-base font-mono">{group.invitationCode}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Members</p>
                <p className="text-base font-semibold">{group.memberCount}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Games</p>
                <p className="text-base font-semibold">{group.gameCount}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-base">{format(group.createdAt, 'MMM d, yyyy HH:mm')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-base">{format(group.updatedAt, 'MMM d, yyyy HH:mm')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Summary of group activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Members</span>
                <span className="text-2xl font-bold">{members.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Active Members</span>
                <span className="text-2xl font-bold">
                  {members.filter((m) => m.isActive).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Games</span>
                <span className="text-2xl font-bold">{games.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Seasons</span>
                <span className="text-2xl font-bold">{seasons.length}</span>
              </div>
              {currentSeason && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Current Season</span>
                  <span className="text-base font-semibold">{currentSeason.name}</span>
                </div>
              )}
              {members.some((m) => m.rating) && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Average Elo</span>
                  <span className="text-2xl font-bold">
                    {Math.round(
                      members
                        .filter((m) => m.rating)
                        .reduce((sum, m) => sum + (m.rating?.currentRating || 0), 0) /
                        members.filter((m) => m.rating).length
                    )}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seasons */}
      {seasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Seasons</CardTitle>
            <CardDescription>{seasons.length} season{seasons.length > 1 ? 's' : ''} in this group</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {seasons.map((season) => (
                <div key={season.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{season.name}</h4>
                      <p className="text-sm text-muted-foreground font-mono mt-1">{season.id}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {season.isActive && (
                        <Badge variant="success">Active</Badge>
                      )}
                      <div className="text-right">
                        <p className="text-sm font-medium text-muted-foreground">Games</p>
                        <p className="text-base font-semibold">{season.gameCount}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                      <p className="text-base">{format(season.startDate, 'MMM d, yyyy')}</p>
                    </div>
                    {season.endDate && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">End Date</p>
                        <p className="text-base">{format(season.endDate, 'MMM d, yyyy')}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Created</p>
                      <p className="text-base">{format(season.createdAt, 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members & Elo Ratings */}
      <Card>
        <CardHeader>
          <CardTitle>Members & Elo Ratings</CardTitle>
          <CardDescription>
            {currentSeason
              ? `Current season: ${currentSeason.name}`
              : 'No active season'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No members found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  {currentSeason && <TableHead>Current Elo</TableHead>}
                  {currentSeason && <TableHead>Games</TableHead>}
                  {currentSeason && <TableHead>Wins</TableHead>}
                  {currentSeason && <TableHead>Losses</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={`${member.uid}_${member.groupId}`}>
                    <TableCell className="font-medium">{member.displayName}</TableCell>
                    <TableCell className="font-mono text-xs">{member.uid}</TableCell>
                    <TableCell>
                      <Badge variant={member.isActive ? 'success' : 'destructive'}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(member.joinedAt, 'MMM d, yyyy')}</TableCell>
                    {currentSeason && (
                      <>
                        <TableCell>
                          {member.rating ? (
                            <span className="font-semibold text-primary">
                              {Math.round(member.rating.currentRating)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {member.rating ? member.rating.gamesPlayed : '-'}
                        </TableCell>
                        <TableCell>
                          {member.rating ? (
                            <span className="text-green-600">{member.rating.wins}</span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {member.rating ? (
                            <span className="text-red-600">{member.rating.losses}</span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Games */}
      {games.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Games</CardTitle>
            <CardDescription>Latest {Math.min(games.length, 10)} games</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game ID</TableHead>
                  <TableHead>Season</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {games.slice(0, 10).map((game) => (
                  <TableRow key={game.id}>
                    <TableCell className="font-mono text-xs">{game.id}</TableCell>
                    <TableCell className="font-mono text-xs">{game.seasonId}</TableCell>
                    <TableCell className="font-mono text-xs">{game.createdBy}</TableCell>
                    <TableCell>{format(game.createdAt, 'MMM d, yyyy HH:mm')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

