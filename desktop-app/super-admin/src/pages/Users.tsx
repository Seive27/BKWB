import React, { useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Circle,
  TrendingUp,
  Users as UsersIcon,
  Clock,
  Key,
} from 'lucide-react';
import AddUserModal, { UserFormData } from '../components/AddUserModal';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'away' | 'offline';
  lastActive: string;
  avatar?: string;
}

const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin Ouan',
    email: 'admin.ouan@bkwb.gov.ph',
    role: 'Super Admin',
    status: 'active',
    lastActive: '2 mins ago',
  },
  {
    id: '2',
    name: 'Juan Dela Cruz',
    email: 'juan.delacruz@bkwb.gov.ph',
    role: 'Water Billing Staff',
    status: 'active',
    lastActive: '10 mins ago',
  },
  {
    id: '3',
    name: 'Maria Santos',
    email: 'maria.santos@bkwb.gov.ph',
    role: 'Water Billing Staff',
    status: 'active',
    lastActive: '30 mins ago',
  },
  {
    id: '4',
    name: 'Ricardo Sanchez',
    email: 'ricardo.s@bkwb.gov.ph',
    role: 'Meter Reader',
    status: 'active',
    lastActive: '45 mins ago',
  },
  {
    id: '5',
    name: 'Ana Batungbakal',
    email: 'ana.b@bkwb.gov.ph',
    role: 'Meter Reader',
    status: 'away',
    lastActive: '2 hours ago',
  },
  {
    id: '6',
    name: 'Elena Rodriguez',
    email: 'elena.r@resident.bkwb.ph',
    role: 'Consumer',
    status: 'active',
    lastActive: '5 mins ago',
  },
  {
    id: '7',
    name: 'Pedro Gonzales',
    email: 'pedro.g@resident.bkwb.ph',
    role: 'Consumer',
    status: 'offline',
    lastActive: '1 day ago',
  },
  {
    id: '8',
    name: 'Mark Jayson Sy',
    email: 'mark.sy@resident.bkwb.ph',
    role: 'Consumer',
    status: 'active',
    lastActive: '1 hour ago',
  },
  {
    id: '9',
    name: 'Victoria Blanco',
    email: 'victoria.b@resident.bkwb.ph',
    role: 'Consumer',
    status: 'offline',
    lastActive: '3 days ago',
  },
  {
    id: '10',
    name: 'Ricardo Go',
    email: 'ricardo.go@resident.bkwb.ph',
    role: 'Consumer',
    status: 'active',
    lastActive: '20 mins ago',
  },
];

const Users: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users] = useState(mockUsers);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);

  const totalUsers = 1284;
  const activeNow = 432;
  const pendingInvitations = 18;
  const accessLogs24h = 3200;

  const handleAddUser = (userData: UserFormData) => {
    console.log('Adding new user:', userData);
    // In production, this would call the API to create the user
    // Show success toast notification
    alert(`User ${userData.fullName} created successfully!`);
  };

  const getRoleColor = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('super admin')) return 'text-purple-600 bg-purple-50';
    if (roleLower.includes('staff') || roleLower.includes('billing')) return 'text-green-600 bg-green-50';
    if (roleLower.includes('meter reader')) return 'text-indigo-600 bg-indigo-50';
    if (roleLower.includes('consumer') || roleLower.includes('resident')) return 'text-gray-600 bg-gray-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'active':
        return <Circle className="w-2 h-2 fill-green-500 text-green-500" />;
      case 'away':
        return <Circle className="w-2 h-2 fill-yellow-500 text-yellow-500" />;
      case 'offline':
        return <Circle className="w-2 h-2 fill-gray-400 text-gray-400" />;
      default:
        return <Circle className="w-2 h-2 fill-gray-400 text-gray-400" />;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-sm text-gray-600">
            Manage all users across the BKWB platform including consumers, staff, and meter readers.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 uppercase font-medium">Total Users</span>
              <UsersIcon className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-end space-x-2">
              <h3 className="text-3xl font-bold text-gray-900">
                {totalUsers.toLocaleString()}
              </h3>
              <div className="flex items-center space-x-1 text-green-600 mb-1">
                <TrendingUp className="w-3 h-3" />
                <span className="text-xs font-semibold">+19%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 uppercase font-medium">Active Now</span>
              <Circle className="w-4 h-4 text-green-500 fill-green-500" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900">{activeNow}</h3>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 uppercase font-medium">
                Pending Invitations
              </span>
              <Clock className="w-4 h-4 text-gray-400" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900">{pendingInvitations}</h3>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 uppercase font-medium">
                Access Logs (24H)
              </span>
              <Key className="w-4 h-4 text-gray-400" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900">
              {(accessLogs24h / 1000).toFixed(1)}k
            </h3>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-gray-200">
          {/* Table Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Filter className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">Filters</span>
                </button>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ml-3"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add User</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-white">
                            {getInitials(user.name)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${getRoleColor(
                          user.role
                        )}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIndicator(user.status)}
                        <span className="text-sm text-gray-900 capitalize">{user.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user.lastActive}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4 text-gray-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing 1 to 10 of 1,284 users
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                Previous
              </button>
              <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded">1</button>
              <button className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                2
              </button>
              <button className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                3
              </button>
              <span className="px-2 text-gray-500">...</span>
              <button className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                128
              </button>
              <button className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                Next
              </button>
            </div>
          </div>

          {/* Footer Links */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <button className="hover:text-gray-700">SECURITY POLICY</button>
              <button className="hover:text-gray-700">USER PRIVACY</button>
              <button className="hover:text-gray-700">ACCESS LOGS</button>
            </div>
            <div>
              <span className="text-gray-400">SYSTEM VERSION 4.2.0-STABLE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddUser}
      />
    </div>
  );
};

export default Users;
