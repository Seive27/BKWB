import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  UserX,
  AlertCircle,
} from 'lucide-react';
import AddUserModal, { UserFormData, UserCreatedInfo } from '../components/modals/AddUserModal';
import { useAuth } from '../hooks/useAuth';
import { useInvalidatingMutation } from '../hooks/useInvalidatingMutation';
import { queryErrorMessage } from '../lib/queryError';
import { queryKeys } from '../lib/queryKeys';
import {
  getUsers,
  createUser,
  setUserActive,
  type ManagedUser,
} from '../services/userService';
import type { Role } from '../types';

const ROLE_FILTERS = ['All Roles', 'Super Admin', 'Staff', 'Staff + Admins', 'Meter Reader', 'Resident'] as const;
const STATUS_FILTERS = ['All Statuses', 'Active', 'Inactive'] as const;
type StatusFilter = 'all' | 'active' | 'inactive';
const PAGE_SIZE = 10;

function statusFilterValue(label: (typeof STATUS_FILTERS)[number]): StatusFilter {
  if (label === 'Active') return 'active';
  if (label === 'Inactive') return 'inactive';
  return 'all';
}

function statusFilterLabel(value: StatusFilter): (typeof STATUS_FILTERS)[number] {
  if (value === 'active') return 'Active';
  if (value === 'inactive') return 'Inactive';
  return 'All Statuses';
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatLastActive(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const Users: React.FC = () => {
  const { isAuthenticated, user: currentUser } = useAuth();
  const usersQuery = useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: getUsers,
    enabled: isAuthenticated,
  });
  const createUserMutation = useInvalidatingMutation(
    (input: Parameters<typeof createUser>[0]) => createUser(input),
    [queryKeys.users.all]
  );
  const setUserActiveMutation = useInvalidatingMutation(
    (input: { userId: string; isActive: boolean }) => setUserActive(input.userId, input.isActive),
    [queryKeys.users.all]
  );
  const users = usersQuery.data ?? [];
  const loading = usersQuery.isLoading;
  const error = queryErrorMessage(usersQuery.error, 'Failed to load users.');
  const load = () => {
    void usersQuery.refetch();
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All Roles');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showRoleFilter, setShowRoleFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  /** Error from the last create attempt — shown inside the Add User modal. */
  const [createError, setCreateError] = useState<string | null>(null);
  /** Credentials of the last successfully created user — drives the success view. */
  const [createdUser, setCreatedUser] = useState<UserCreatedInfo | null>(null);
  /** Monotonic id of the latest create request — used to ignore stale in-flight results. */
  const addUserRequestRef = useRef(0);
  const [openMenu, setOpenMenu] = useState<{ userId: string; top: number; left: number } | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  /** Brief border flash on a stats-card click; fades out over 3s. */
  const [cardFlash, setCardFlash] = useState<'total' | 'active' | 'residents' | 'staff' | null>(null);
  const [cardFlashOpaque, setCardFlashOpaque] = useState(false);
  const cardFlashTimersRef = useRef<{ fade?: number; clear?: number }>({});

  const roleCounts = () => {
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
  };

  const totalUsers = users.length;
  const activeNow = users.filter((u) => u.isActive).length;
  const counts = roleCounts();

  const filteredUsers = users.filter((user) => {
    const fullName = `${user.firstName} ${user.middleName ?? ''} ${user.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.roleLabel.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole =
      roleFilter === 'All Roles' ||
      (roleFilter === 'Staff + Admins'
        ? user.roleLabel === 'Staff' || user.roleLabel === 'Super Admin'
        : user.roleLabel === roleFilter);
    const matchesStatus =
      statusFilter === 'all' || (statusFilter === 'active' ? user.isActive : !user.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Reset pagination whenever search/filters change.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    document.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [openMenu]);

  useEffect(() => {
    return () => {
      const timers = cardFlashTimersRef.current;
      if (timers.fade) window.clearTimeout(timers.fade);
      if (timers.clear) window.clearTimeout(timers.clear);
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );
  const startEntry = filteredUsers.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endEntry = Math.min(safePage * PAGE_SIZE, filteredUsers.length);

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
      await createUserMutation.mutateAsync({
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
    if (roleLower.includes('super admin')) return 'text-amber-600 bg-amber-50';
    if (roleLower.includes('staff')) return 'text-emerald-600 bg-emerald-50';
    if (roleLower.includes('meter reader')) return 'text-primary-600 bg-primary-50';
    if (roleLower.includes('resident')) return 'text-gray-600 bg-gray-50';
    return 'text-gray-600 bg-gray-50';
  };

  const applyCardFilter = (card: 'total' | 'active' | 'residents' | 'staff') => {
    setShowRoleFilter(false);
    setShowStatusFilter(false);
    if (card === 'total') {
      setRoleFilter('All Roles');
      setStatusFilter('all');
    } else if (card === 'active') {
      setRoleFilter('All Roles');
      setStatusFilter('active');
    } else if (card === 'residents') {
      setRoleFilter('Resident');
      setStatusFilter('all');
    } else {
      setRoleFilter('Staff + Admins');
      setStatusFilter('all');
    }

    const timers = cardFlashTimersRef.current;
    if (timers.fade) window.clearTimeout(timers.fade);
    if (timers.clear) window.clearTimeout(timers.clear);

    setCardFlash(card);
    setCardFlashOpaque(true);
    // Paint the solid outline, then start the 3s fade to the default border.
    timers.fade = window.setTimeout(() => setCardFlashOpaque(false), 40);
    timers.clear = window.setTimeout(() => {
      setCardFlash(null);
      setCardFlashOpaque(false);
    }, 3040);
  };

  const selectedCard =
    roleFilter === 'All Roles' && statusFilter === 'all'
      ? 'total'
      : roleFilter === 'All Roles' && statusFilter === 'active'
        ? 'active'
        : roleFilter === 'Resident' && statusFilter === 'all'
          ? 'residents'
          : roleFilter === 'Staff + Admins' && statusFilter === 'all'
            ? 'staff'
            : null;

  const handleSetActive = async (target: ManagedUser, isActive: boolean) => {
    setOpenMenu(null);
    setActionError(null);
    setActioningId(target.id);
    try {
      await setUserActiveMutation.mutateAsync({ userId: target.id, isActive });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update account status.');
    } finally {
      setActioningId(null);
    }
  };

  const openActionsMenu = (userId: string, button: HTMLButtonElement) => {
    if (openMenu?.userId === userId) {
      setOpenMenu(null);
      return;
    }
    const rect = button.getBoundingClientRect();
    const menuWidth = 176;
    const menuHeight = 88;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < menuHeight + 8 ? rect.top - menuHeight - 4 : rect.bottom + 4;
    const left = Math.max(8, rect.right - menuWidth);
    setOpenMenu({ userId, top, left });
  };

  const getStatusIndicator = (isActive: boolean) => {
    return isActive ? (
      <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
    ) : (
      <Circle className="w-2 h-2 fill-gray-400 text-gray-400" />
    );
  };

  const roleStats = [
    { label: 'Super Admin', count: counts['Super Admin'], color: 'bg-amber-500' },
    { label: 'Staff', count: counts.Staff, color: 'bg-emerald-500' },
    { label: 'Meter Reader', count: counts['Meter Reader'], color: 'bg-primary-500' },
    { label: 'Resident', count: counts.Resident, color: 'bg-gray-500' },
  ];

  const menuUser = openMenu ? users.find((u) => u.id === openMenu.userId) ?? null : null;
  const menuIsSelf = menuUser != null && currentUser?.id === menuUser.id;

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
        {actionError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{actionError}</div>
        )}

        {/* Stats Cards — click to filter the table */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {(
            [
              {
                id: 'total' as const,
                label: 'Total Users',
                value: totalUsers,
                icon: <UsersIcon className="w-4 h-4 text-gray-400" />,
              },
              {
                id: 'active' as const,
                label: 'Active Users',
                value: activeNow,
                icon: <UserCheck className="w-4 h-4 text-emerald-500" />,
              },
              {
                id: 'residents' as const,
                label: 'Residents',
                value: counts.Resident,
                icon: <UsersIcon className="w-4 h-4 text-gray-400" />,
              },
              {
                id: 'staff' as const,
                label: 'Staff + Admins',
                value: counts.Staff + counts['Super Admin'],
                icon: <Key className="w-4 h-4 text-gray-400" />,
              },
            ]
          ).map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => applyCardFilter(card.id)}
              aria-pressed={selectedCard === card.id}
              className={`text-left bg-white rounded-xl border p-6 cursor-pointer hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 ${
                cardFlash === card.id
                  ? cardFlashOpaque
                    ? 'border-primary-400 shadow-md transition-none'
                    : 'border-gray-200 shadow-none transition-[border-color,box-shadow] duration-[3000ms] ease-out'
                  : 'border-gray-200 hover:border-primary-300 transition-all duration-150'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600 uppercase font-medium">{card.label}</span>
                {card.icon}
              </div>
              <h3 className="text-3xl font-bold text-gray-900">{card.value.toLocaleString()}</h3>
            </button>
          ))}
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
                    onClick={() => {
                      setShowRoleFilter(!showRoleFilter);
                      setShowStatusFilter(false);
                    }}
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
                            <span className="float-right text-xs text-gray-400">
                              (
                              {role === 'Staff + Admins'
                                ? counts.Staff + counts['Super Admin']
                                : counts[role] ?? 0}
                              )
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => {
                      setShowStatusFilter(!showStatusFilter);
                      setShowRoleFilter(false);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Circle className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">{statusFilterLabel(statusFilter)}</span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                  {showStatusFilter && (
                    <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-44">
                      {STATUS_FILTERS.map((status) => (
                        <button
                          key={status}
                          onClick={() => {
                            setStatusFilter(statusFilterValue(status));
                            setShowStatusFilter(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                            statusFilterLabel(statusFilter) === status
                              ? 'text-primary-600 font-medium bg-primary-50'
                              : 'text-gray-700'
                          }`}
                        >
                          {status}
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
                  paginatedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary-700 rounded-full flex items-center justify-center">
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
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => openActionsMenu(user.id, e.currentTarget)}
                          disabled={actioningId === user.id}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
                          title="Actions"
                        >
                          {actioningId === user.id ? (
                            <RefreshCw className="w-4 h-4 text-gray-600 animate-spin" />
                          ) : (
                            <MoreVertical className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {filteredUsers.length === 0
                ? 'Showing 0 users'
                : `Showing ${startEntry} - ${endEntry} of ${filteredUsers.length} users`}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={load}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
              {!loading && filteredUsers.length > 0 && (
                <>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (safePage <= 3) {
                      pageNum = i + 1;
                    } else if (safePage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = safePage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          safePage === pageNum
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-600 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {menuUser && openMenu && (
        <div
          className="fixed z-50 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
          style={{ top: openMenu.top, left: openMenu.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => handleSetActive(menuUser, true)}
            disabled={actioningId === menuUser.id || menuUser.isActive || menuIsSelf}
            title={
              menuIsSelf
                ? 'You cannot change your own account status.'
                : 'Allow this user to sign in.'
            }
            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Activate</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetActive(menuUser, false)}
            disabled={actioningId === menuUser.id || !menuUser.isActive || menuIsSelf}
            title={
              menuIsSelf
                ? 'You cannot change your own account status.'
                : 'Block this user from signing in.'
            }
            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <UserX className="w-4 h-4" />
            <span>Disable</span>
          </button>
        </div>
      )}

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
