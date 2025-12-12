import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import { Users, CreditCard, TrendingUp, Euro, Shield } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bankInfo, setBankInfo] = useState({
    bank_name: '',
    account_holder_name: '',
    iban: '',
    swift_code: '',
    notes: ''
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(
        `${API}/admin/stats?username=admin&password=admin`
      );
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load admin statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleBankInfoUpdate = async () => {
    try {
      await axios.post(`${API}/admin/bank-info`, bankInfo, {
        params: {
          username: 'admin',
          password: 'admin'
        }
      });
      toast.success('Bank information updated successfully');
    } catch (error) {
      console.error('Error updating bank info:', error);
      toast.error('Failed to update bank information');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.free_users || 0} free, {stats?.premium_users || 0} premium
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Premium Users
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.premium_users || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.total_users > 0 
                ? Math.round((stats.premium_users / stats.total_users) * 100)
                : 0}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Payments
            </CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.successful_payments || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.total_payments || 0} total attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Revenue
            </CardTitle>
            <Euro className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{(stats?.total_revenue || 0).toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">EUR</p>
          </CardContent>
        </Card>
      </div>

      {/* Bank Information Form */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={bankInfo.bank_name}
                  onChange={(e) => setBankInfo({...bankInfo, bank_name: e.target.value})}
                  placeholder="e.g., Deutsche Bank"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_holder">Account Holder Name</Label>
                <Input
                  id="account_holder"
                  value={bankInfo.account_holder_name}
                  onChange={(e) => setBankInfo({...bankInfo, account_holder_name: e.target.value})}
                  placeholder="Your Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  value={bankInfo.iban}
                  onChange={(e) => setBankInfo({...bankInfo, iban: e.target.value})}
                  placeholder="DE89 3704 0044 0532 0130 00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="swift">SWIFT/BIC Code</Label>
                <Input
                  id="swift"
                  value={bankInfo.swift_code}
                  onChange={(e) => setBankInfo({...bankInfo, swift_code: e.target.value})}
                  placeholder="COBADEFFXXX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={bankInfo.notes}
                onChange={(e) => setBankInfo({...bankInfo, notes: e.target.value})}
                placeholder="Additional information..."
              />
            </div>

            <Button onClick={handleBankInfoUpdate} className="w-full md:w-auto">
              Save Bank Information
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
