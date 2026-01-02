import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
import { ArrowUp, ArrowDown } from 'lucide-react';

type SortField = 'memberCount' | 'gameCount' | null;
type SortDirection = 'asc' | 'desc';

export default function Groups() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [sortField, setSortField] = useState<SortField>(
    (searchParams.get('sort') as SortField) || null
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    (searchParams.get('direction') as SortDirection) || 'desc'
  );

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const data = await AdminService.getGroups();
        setGroups(data);
      } catch (error) {
        console.error('Failed to load groups:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, []);

  // Sync sort state from URL params on mount
  useEffect(() => {
    const sortParam = searchParams.get('sort');
    const directionParam = searchParams.get('direction');
    
    if (sortParam === 'memberCount' || sortParam === 'gameCount') {
      setSortField(sortParam);
    }
    
    if (directionParam === 'asc' || directionParam === 'desc') {
      setSortDirection(directionParam);
    }
  }, [searchParams]);

  // Filter groups based on search term
  const filteredGroups = useMemo(() => {
    let filtered = groups;

    if (searchTerm) {
      filtered = groups.filter(
        (group) =>
          group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          group.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          group.invitationCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort groups
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        
        if (sortDirection === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
    }

    return filtered;
  }, [groups, searchTerm, sortField, sortDirection]);

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
      setSearchParams((prev) => {
        prev.set('sort', field || '');
        prev.set('direction', newDirection);
        return prev;
      });
    } else {
      // Set new field with default descending direction
      setSortField(field);
      setSortDirection('desc');
      setSearchParams((prev) => {
        if (field) {
          prev.set('sort', field);
          prev.set('direction', 'desc');
        } else {
          prev.delete('sort');
          prev.delete('direction');
        }
        return prev;
      });
    }
  };

  const handleGroupClick = (groupId: string) => {
    navigate(`/groups/${groupId}`);
  };

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
              onChange={(e) => handleSearchChange(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Group ID</TableHead>
                <TableHead>Owner ID</TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('memberCount')}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    Members
                    {sortField === 'memberCount' && (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('gameCount')}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    Games
                    {sortField === 'gameCount' && (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )
                    )}
                  </button>
                </TableHead>
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
                  <TableRow
                    key={group.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleGroupClick(group.id)}
                  >
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

