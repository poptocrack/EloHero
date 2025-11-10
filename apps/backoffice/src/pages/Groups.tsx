import { useEffect, useState } from 'react';
import { AdminService } from '@/services/admin';
import type { Group } from '@elohero/shared-types';
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

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const data = await AdminService.getGroups();
        setGroups(data);
        setFilteredGroups(data);
      } catch (error) {
        console.error('Failed to load groups:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredGroups(groups);
      return;
    }

    const filtered = groups.filter(
      (group) =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.invitationCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredGroups(filtered);
  }, [searchTerm, groups]);

  if (loading) {
    return <div className="text-lg">Loading groups...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
        <p className="mt-2 text-sm text-gray-600">Manage all groups in the system</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Groups</CardTitle>
          <CardDescription>A list of all groups</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search by name, ID, or invitation code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Group ID</TableHead>
                <TableHead>Owner ID</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Games</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invitation Code</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No groups found
                  </TableCell>
                </TableRow>
              ) : (
                filteredGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell className="font-mono text-xs">{group.id}</TableCell>
                    <TableCell className="font-mono text-xs">{group.ownerId}</TableCell>
                    <TableCell>{group.memberCount}</TableCell>
                    <TableCell>{group.gameCount}</TableCell>
                    <TableCell>
                      <Badge variant={group.isActive ? 'success' : 'destructive'}>
                        {group.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{group.invitationCode}</TableCell>
                    <TableCell>{format(group.createdAt, 'MMM d, yyyy')}</TableCell>
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

