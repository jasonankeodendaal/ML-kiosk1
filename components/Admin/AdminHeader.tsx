import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HomeIcon, ArrowRightOnRectangleIcon } from '../Icons.tsx';
import { useAppContext } from '../context/AppContext.tsx';

const AdminHeader: React.FC = () => {
    const { loggedInUser, logout } = useAppContext();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="admin-header">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 section-heading">
                    Admin Dashboard
                </h1>
                {loggedInUser && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Signed in as {loggedInUser.firstName} {loggedInUser.lastName}
                    </p>
                )}
            </div>
            <div className="flex items-center gap-2">
                <Link to="/" className="btn bg-white/50 dark:bg-gray-700/50 border border-transparent hover:border-gray-300 dark:hover:border-gray-600">
                    <HomeIcon className="h-5 w-5" />
                    <span>View Kiosk</span>
                </Link>
                <button onClick={handleLogout} className="btn btn-destructive">
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    <span>Logout</span>
                </button>
            </div>
        </header>
    );
};

export default AdminHeader;
