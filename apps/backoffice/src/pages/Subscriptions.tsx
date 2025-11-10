import { useEffect, useState } from 'react';
import { AdminService } from '@/services/admin';
import type { Subscription } from '@elohero/shared-types';
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

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadSubscriptions = async () => {
      try {
        const data = await AdminService.getSubscriptions();
        setSubscriptions(data);
        setFilteredSubscriptions(data);
      } catch (error) {
        console.error('Failed to load subscriptions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSubscriptions();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredSubscriptions(subscriptions);
      return;
    }

    const filtered = subscriptions.filter(
      (subscription) =>
        subscription.uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subscription.plan.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subscription.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSubscriptions(filtered);
  }, [searchTerm, subscriptions]);

  if (loading) {
    return <div className="text-lg">Loading subscriptions...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Subscriptions</h1>
        <p className="mt-2 text-sm text-gray-600">Manage user subscriptions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
          <CardDescription>A list of all user subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search by user ID, plan, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period Start</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No subscriptions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubscriptions.map((subscription) => (
                  <TableRow key={subscription.uid}>
                    <TableCell className="font-mono text-xs">{subscription.uid}</TableCell>
                    <TableCell>
                      <Badge variant={subscription.plan === 'premium' ? 'default' : 'secondary'}>
                        {subscription.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          subscription.status === 'active'
                            ? 'success'
                            : subscription.status === 'canceled'
                            ? 'warning'
                            : 'destructive'
                        }
                      >
                        {subscription.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(subscription.currentPeriodStart, 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>{format(subscription.currentPeriodEnd, 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(subscription.createdAt, 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(subscription.updatedAt, 'MMM d, yyyy')}</TableCell>
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

