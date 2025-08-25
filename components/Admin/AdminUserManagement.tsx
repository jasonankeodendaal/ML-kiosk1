import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.tsx';
import { PlusIcon, PencilIcon, TrashIcon } from '../Icons.tsx';
import type { KioskUser } from '../../types.ts';

const KioskUsers: React.FC = () => {
    const { kioskUsers, deleteKioskUser, showConfirmation } = useAppContext();
    const navigate = useNavigate();

    const handleDelete = (user: KioskUser) => {
        showConfirmation(
            `Are you sure you want to move the user "${user.name}" to the trash?`,
            () => deleteKioskUser(user.id)
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">These users log into the main kiosk interface. Their access is controlled by the "Require Kiosk Login" setting.</p>
                <Link to="/admin/kiosk-user/new" className="btn btn-primary">
                    <PlusIcon className="h-4 w-4" />
                    <span>Add Kiosk User</span>
                </Link>
            </div>

            <div className="overflow-x-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {kioskUsers.filter(u => !u.isDeleted).map(user => (
                        <div key={user.id} className="bg-white dark:bg-gray-800/50 p-4 rounded-xl shadow-lg border dark:border-gray-700/50 flex items-center justify-between gap-4">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{user.name}</p>
                            <div className="flex items-center gap-1">
                                <button onClick={() => navigate(`/admin/kiosk-user/edit/${user.id}`)} className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Edit User">
                                    <PencilIcon className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDelete(user)} className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Delete User">
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AdminUsers: React.FC = () => {
    const { adminUsers, deleteAdminUser, loggedInUser, showConfirmation } = useAppContext();

    const handleDelete = (userId: string, userName: string) => {
        showConfirmation(
            `Are you sure you want to delete user "${userName}"? This cannot be undone.`,
            () => deleteAdminUser(userId)
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <p className="text-sm text-gray-600 dark:text-gray-400">Only the main admin can create, edit, or delete other admin users.</p>
                <Link to="/admin/user/new" className="btn btn-primary">
                    <PlusIcon className="h-4 w-4" />
                    <span>Add Admin User</span>
                </Link>
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact Tel</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {adminUsers.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.tel}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {user.isMainAdmin ? 
                                        <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Main Admin</span> : 
                                        <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">Admin</span>
                                    }
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-1">
                                        <Link to={`/admin/user/edit/${user.id}`} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Edit User">
                                            <PencilIcon className="h-4 w-4" />
                                        </Link>
                                        {!user.isMainAdmin && user.id !== loggedInUser?.id && (
                                            <button onClick={() => handleDelete(user.id, `${user.firstName} ${user.lastName}`)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Delete User">
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const AdminUserManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'admins' | 'kiosk'>('admins');

    return (
        <div className="space-y-6">
            <h3 className="text-xl text-gray-800 dark:text-gray-100 section-heading">Manage Users</h3>
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('admins')} className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'admins' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Admin Users
                    </button>
                    <button onClick={() => setActiveTab('kiosk')} className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'kiosk' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Kiosk Users
                    </button>
                </nav>
            </div>
            
            {activeTab === 'admins' && <AdminUsers />}
            {activeTab === 'kiosk' && <KioskUsers />}
        </div>
    )
};


export default AdminUserManagement;