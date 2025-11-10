import { useEffect, useState } from 'react';
import { AdminService } from '@/services/admin';
import type { Season } from '@elohero/shared-types';
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

export default function Seasons() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [filteredSeasons, setFilteredSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadSeasons = async () => {
      try {
        const data = await AdminService.getSeasons();
        setSeasons(data);
        setFilteredSeasons(data);
      } catch (error) {
        console.error('Failed to load seasons:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSeasons();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredSeasons(seasons);
      return;
    }

    const filtered = seasons.filter(
      (season) =>
        season.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        season.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        season.groupId.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSeasons(filtered);
  }, [searchTerm, seasons]);

  if (loading) {
    return <div className="text-lg">Loading seasons...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Seasons</h1>
        <p className="mt-2 text-sm text-gray-600">View all seasons across groups</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Seasons</CardTitle>
          <CardDescription>A list of all seasons in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search by name, season ID, or group ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Season ID</TableHead>
                <TableHead>Group ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Games</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSeasons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No seasons found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSeasons.map((season) => (
                  <TableRow key={season.id}>
                    <TableCell className="font-medium">{season.name}</TableCell>
                    <TableCell className="font-mono text-xs">{season.id}</TableCell>
                    <TableCell className="font-mono text-xs">{season.groupId}</TableCell>
                    <TableCell>
                      <Badge variant={season.isActive ? 'success' : 'secondary'}>
                        {season.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{season.gameCount}</TableCell>
                    <TableCell>{format(season.startDate, 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {season.endDate ? format(season.endDate, 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>{format(season.createdAt, 'MMM d, yyyy')}</TableCell>
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

