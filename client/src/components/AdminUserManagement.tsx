/*
 * Admin User Management Component
 * Interface for administrators to manage users and roles
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth, UserRole } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Trash2, Edit2, Plus, X, Check, UserPlus, Shield, User as UserIcon } from 'lucide-react';

interface User {
  id: number;
  username: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  is_active: number;
}

interface UserFormData {
  username: string;
  password: string;
  role: UserRole;
}

export default function AdminUserManagement() {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    password: '',
    role: 'user'
  });

  // Fetch all users
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setUsers(response.data.users);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('Admin access required');
      } else {
        toast.error('Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin()) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, []);

  // Create new user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      toast.error('Username and password are required');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(
        '/api/admin/users',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('User created successfully');
        setShowAddModal(false);
        setFormData({ username: '', password: '', role: 'user' });
        fetchUsers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create user');
    }
  };

  // Update user
  const handleUpdateUser = async (userId: number, updates: Partial<User>) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.put(
        `/api/admin/users/${userId}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('User updated successfully');
        setEditingUser(null);
        fetchUsers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update user');
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.delete(
        `/api/admin/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('User deleted successfully');
        fetchUsers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete user');
    }
  };

  // Toggle user role
  const toggleUserRole = (user: User) => {
    const newRole: UserRole = user.role === 'admin' ? 'user' : 'admin';
    handleUpdateUser(user.id, { role: newRole });
  };

  // Toggle user active status
  const toggleUserStatus = (user: User) => {
    const newStatus = user.is_active === 1 ? 0 : 1;
    handleUpdateUser(user.id, { is_active: newStatus });
  };

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            You must be an administrator to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              User Management
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage user accounts and permissions
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Add User
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Username
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <UserIcon className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user.username}
                      {user.id === currentUser?.id && (
                        <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(You)</span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleUserRole(user)}
                    disabled={user.id === currentUser?.id}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    } ${user.id === currentUser?.id ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-75 cursor-pointer'}`}
                  >
                    {user.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : null}
                    {user.role}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleUserStatus(user)}
                    disabled={user.id === currentUser?.id}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      user.is_active === 1
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    } ${user.id === currentUser?.id ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-75 cursor-pointer'}`}
                  >
                    {user.is_active === 1 ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleDeleteUser(user.id, user.username)}
                    disabled={user.id === currentUser?.id}
                    className={`text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 ${
                      user.id === currentUser?.id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title={user.id === currentUser?.id ? 'Cannot delete your own account' : 'Delete user'}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12">
            <UserIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No users found</p>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add New User</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ username: '', password: '', role: 'user' });
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Create User
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ username: '', password: '', role: 'user' });
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
