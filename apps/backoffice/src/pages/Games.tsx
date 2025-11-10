import { useEffect, useState } from 'react';
import { AdminService } from '@/services/admin';
import type { Game } from '@elohero/shared-types';
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
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';

export default function Games() {
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadGames = async () => {
      try {
        const data = await AdminService.getGames();
        setGames(data);
        setFilteredGames(data);
      } catch (error) {
        console.error('Failed to load games:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGames();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredGames(games);
      return;
    }

    const filtered = games.filter(
      (game) =>
        game.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.groupId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.seasonId.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredGames(filtered);
  }, [searchTerm, games]);

  if (loading) {
    return <div className="text-lg">Loading games...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Games</h1>
        <p className="mt-2 text-sm text-gray-600">View all games played</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Games</CardTitle>
          <CardDescription>A list of all games played in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search by game ID, group ID, or season ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Game ID</TableHead>
                <TableHead>Group ID</TableHead>
                <TableHead>Season ID</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGames.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No games found
                  </TableCell>
                </TableRow>
              ) : (
                filteredGames.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell className="font-mono text-xs">{game.id}</TableCell>
                    <TableCell className="font-mono text-xs">{game.groupId}</TableCell>
                    <TableCell className="font-mono text-xs">{game.seasonId}</TableCell>
                    <TableCell className="font-mono text-xs">{game.createdBy}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{game.gameType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={game.status === 'completed' ? 'success' : 'warning'}>
                        {game.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(game.createdAt, 'MMM d, yyyy HH:mm')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

