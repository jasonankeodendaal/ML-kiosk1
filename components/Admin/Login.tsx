import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const AdminLogin: React.FC = () => {
    const { adminUsers, login, loggedInUser, showConfirmation, resetToDefaultData } = useAppContext();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (loggedInUser) {
            navigate('/admin', { replace: true });
        }
    }, [loggedInUser, navigate]);

    useEffect(() => {
        // Select the main admin by default if it exists, otherwise select the first user.
        const mainAdmin = adminUsers.find(u => u.isMainAdmin);
        if (mainAdmin) {
            setSelectedUserId(mainAdmin.id);
        } else if (adminUsers.length > 0) {
            setSelectedUserId(adminUsers[0].id);
        }
    }, [adminUsers]);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!selectedUserId) {
            setError('Please select a user.');
            return;
        }

        if (!pin) {
            setError('Please enter your PIN.');
            return;
        }

        const user = login(selectedUserId, pin);

        if (!user) {
            setError('Invalid PIN for the selected user. Please try again.');
            setPin(''); // Clear PIN field on error
        }
    };

    const handleReset = () => {
        showConfirmation(
            'Are you sure you want to reset all data to the initial demo content? This will erase all brands, products, and settings you have created. This action cannot be undone.',
            () => {
                resetToDefaultData();
                alert('Application has been reset to demo data. Please log in with the default PIN.');
                window.location.reload();
            }
        );
    };

    return (
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl w-full space-y-8 bg-gray-100 dark:bg-gray-800 p-10 rounded-2xl shadow-2xl">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
                        Admin Portal
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-center text-gray-700 dark:text-gray-300 mb-3">Select User</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {adminUsers.map(user => (
                                <button
                                    type="button"
                                    key={user.id}
                                    onClick={() => setSelectedUserId(user.id)}
                                    className={`p-3 text-center rounded-lg font-semibold transition-all duration-200 border-2 ${
                                        selectedUserId === user.id
                                            ? 'bg-gray-800 text-white border-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100 shadow-lg'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-800 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:border-gray-400'
                                    }`}
                                >
                                    {user.firstName} {user.isMainAdmin && <span className="text-xs opacity-70 block">(Main)</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="rounded-md space-y-4 pt-4">
                        <div>
                            <label htmlFor="pin-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-center">PIN</label>
                            <input
                                id="pin-input"
                                name="pin"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-gray-800 focus:border-gray-800 focus:z-10 sm:text-sm shadow-sm bg-white dark:bg-gray-700"
                                placeholder="Enter 4-Digit PIN"
                                maxLength={4}
                                pattern="\d{4}"
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 dark:text-red-500 text-center pt-2">{error}</p>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                        >
                            Log In
                        </button>
                    </div>

                    <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="text-sm text-gray-500 dark:text-gray-400 hover:underline"
                        >
                            Trouble logging in or missing data? Reset to factory settings.
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;