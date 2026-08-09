import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Circle,
  Users as UsersIcon,
  Key,
  ChevronDown,
  RefreshCw,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import AddUserModal, { UserFormData, UserCreatedInfo } from '../components/modals/AddUserModal';
import {
  getUsers,
  createUser,
  type ManagedUser,
} from '../services/userService';
import type { Role } from '../types';

const ROLE_FILTERS = ['All Roles', 'Super Admin', 'Staff', 'Meter Reader', 'Resident'] as const;

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatLastActive(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const Users: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All Roles');
  const [showRoleFilter, setShowRoleFilter] = useState(false);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  /** Error from the last create attempt — shown inside the Add User modal. */
  const [createError, setCreateError] = useState<string | null>(null);
  /** Credentials of the last successfully created user — drives the success view. */
  const [createdUser, setCreatedUser] = useState<UserCreatedInfo | null>(null);
  /** Monotonic id of the latest create request — used to ignore stale in-flight results. */
  const addUserRequestRef = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const roleCounts = useCallback(() => {
    const counts: Record<string, number> = {
      'Super Admin': 0,
      Staff: 0,
      'Meter Reader': 0,
      Resident: 0,
    };
    users.forEach((u) => {
      if (counts[u.roleLabel] !== undefined) counts[u.roleLabel] += 1;
    });
    return counts;
  }, [users]);

  const totalUsers = users.length;
  const activeNow = users.filter((u) => u.isActive).length;
  const counts = roleCounts();

  const filteredUsers = users.filter((user) => {
    const fullName = `${user.firstName} ${user.middleName ?? ''} ${user.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.roleLabel.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'All Roles' || user.roleLabel === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleAddUser = async (userData: UserFormData) => {
    const requestId = ++addUserRequestRef.current;
    setCreating(true);
    setCreateError(null);
    try {
      const roleMap: Record<string, Role['name']> = {
        Resident: 'resident',
        'Meter Reader': 'meter_reader',
        Staff: 'staff',
        'Super Admin': 'super_admin',
      };
      const role = roleMap[userData.role] ?? 'resident';
      await createUser({
        email: userData.emailAddress,
        password: userData.password,
        firstName: userData.firstName,
        middleName: userData.middleName,
        lastName: userData.lastName,
        phone: userData.cellNumber,
        dateOfBirth: userData.dateOfBirth,
        role,
      });
      // Ignore the result if the modal was closed/reopened while this request
      // was in flight — otherwise stale credentials could appear in a new session.
      if (addUserRequestRef.current !== requestId) return;
      // The password shown here is EXACTLY the one sent to the edge function
      // (auto-generated for Resident/Meter Reader, manual for Staff/Super Admin).
      setCreatedUser({
        fullName: `${userData.firstName} ${userData.lastName}`.trim(),
        email: userData.emailAddress,
        role: userData.role,
        password: userData.password,
      });
      await load();
    } catch (err) {
      if (addUserRequestRef.current !== requestId) return;
      setCreateError(err instanceof Error ? err.message : 'Failed to create user.');
    } finally {
      if (addUserRequestRef.current === requestId) setCreating(false);
    }
  };

  /** Close the modal, drop stale credentials/errors, and invalidate in-flight requests. */
  const handleCloseAddUser = () => {
    addUserRequestRef.current++;
    setShowAddModal(false);
    setCreatedUser(null);
    setCreateError(null);
    setCreating(false);
  };

  const getRoleColor = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('super admin')) return 'text-purple-600 bg-purple-50';
    if (roleLower.includes('staff')) return 'text-green-600 bg-green-50';
    if (roleLower.includes('meter reader')) return 'text-indigo-600 bg-indigo-50';
    if (roleLower.includes('resident')) return 'text-gray-600 bg-gray-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getStatusIndicator = (isActive: boolean) => {
    return isActive ? (
      <Circle className="w-2 h-2 fill-green-500 text-green-500" />
    ) : (
      <Circle className="w-2 h-2 fill-gray-400 text-gray-400" />
    );
  };

  const roleStats = [
    { label: 'Super Admin', count: counts['Super Admin'], color: 'bg-purple-500' },
    { label: 'Staff', count: counts.Staff, color: 'bg-green-500' },
    { label: 'Meter Reader', count: counts['Meter Reader'], color: 'bg-indigo-500' },
    { label: 'Resident', count: counts.Resident, color: 'bg-gray-500' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-sm text-gray-600">
            Manage all users across the BKWB platform — residents, meter readers, staff, and administrators.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 uppercase font-medium">Total Users</span>
              <UsersIcon className="w-4 h-4 text-gray-400" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900">{totalUsers.toLocaleString()}</h3>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 uppercase font-medium">Active Users</span>
              <UserCheck className="w-4 h-4 text-green-500" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900">{activeNow.toLocaleString()}</h3>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 uppercase font-medium">Residents</span>
              <UsersIcon className="w-4 h-4 text-gray-400" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900">{counts.Resident.toLocaleString()}</h3>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 uppercase font-medium">Staff + Admins</span>
              <Key className="w-4 h-4 text-gray-400" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900">
              {(counts.Staff + counts['Super Admin']).toLocaleString()}
            </h3>
          </div>
        </div>

        {/* Role Distribution */}
        <div className="flex items-center space-x-4 mb-6">
          <span className="text-xs font-semibold text-gray-500 uppercase">Role Distribution:</span>
          {roleStats.map((rs) => (
            <div key={rs.label} className="flex items-center space-x-1.5">
              <div className={`w-2 h-2 rounded-full ${rs.color}`} />
              <span className="text-xs text-gray-600">{rs.label}</span>
              <span className="text-xs font-semibold text-gray-900">({rs.count})</span>
            </div>
          ))}
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

                {/* Role Filter Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowRoleFilter(!showRoleFilter)}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Filter className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">{roleFilter}</span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                  {showRoleFilter && (
                    <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-48">
                      {ROLE_FILTERS.map((role) => (
                        <button
                          key={role}
                          onClick={() => {
                            setRoleFilter(role);
                            setShowRoleFilter(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                            roleFilter === role
                              ? 'text-primary-600 font-medium bg-primary-50'
                              : 'text-gray-700'
                          }`}
                        >
                          {role}
                          {role !== 'All Roles' && (
                            <span className="float-right text-xs text-gray-400">({counts[role] ?? 0})</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setCreatedUser(null);
                  setCreateError(null);
                  setShowAddModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors ml-3"
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center space-x-2 text-gray-400">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Loading users…</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No users found matching your filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-xs font-semibold text-white">
                              {getInitials(user.firstName, user.lastName)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getRoleColor(user.roleLabel)}`}>
                          {user.roleLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIndicator(user.isActive)}
                          <span className="text-sm text-gray-900 capitalize">
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatLastActive(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredUsers.length} of {totalUsers.toLocaleString()} users
            </div>
            <button
              onClick={load}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={showAddModal}
        onClose={handleCloseAddUser}
        onSubmit={handleAddUser}
        submitting={creating}
        error={createError}
        createdUser={createdUser}
      />
    </div>
  );
};

export default Users;
