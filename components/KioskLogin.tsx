
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from './context/AppContext.tsx';
import LocalMedia from './LocalMedia.tsx';
import { motion } from 'framer-motion';

const MotionDiv = motion.div as any;
const MotionForm = motion.form as any;

const KioskLogin: React.FC = () => {
    const { settings, kioskUsers, adminUsers, loginKioskUser, login, loggedInUser } = useAppContext();
    const navigate = useNavigate();
    
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isShaking, setIsShaking] = useState(false);
    const [selectedUser, setSelectedUser] = useState<{ id: string; type: 'admin' | 'kiosk' } | null>(null);

    useEffect(() => {
        // This effect will run when the loggedInUser state changes,
        // ensuring navigation happens only after a successful login is registered.
        if (loggedInUser) {
            navigate('/admin', { replace: true });
        }
    }, [loggedInUser, navigate]);

    const allUsers = useMemo(() => {
        const admins = adminUsers.map(u => ({
            id: u.id,
            name: u.firstName,
            isMainAdmin: u.isMainAdmin,
            type: 'admin' as const
        }));
        const kiosks = kioskUsers.filter(u => !u.isDeleted).map(u => ({
            id: u.id,
            name: u.name,
            isMainAdmin: false,
            type: 'kiosk' as const
        }));
        // Prioritize admins in the list
        return [...admins, ...kiosks];
    }, [adminUsers, kioskUsers]);

    useEffect(() => {
        if (allUsers.length > 0 && !selectedUser) {
            const mainAdmin = allUsers.find(u => u.isMainAdmin && u.type === 'admin');
            if (mainAdmin) {
                setSelectedUser({ id: mainAdmin.id, type: 'admin' });
            } else {
                const firstUser = allUsers[0];
                setSelectedUser({ id: firstUser.id, type: firstUser.type });
            }
        }
    }, [allUsers, selectedUser]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!selectedUser) {
            setError('Please select a user.');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            return;
        }
        
        let success = false;
        if (selectedUser.type === 'admin') {
            const admin = login(selectedUser.id, pin);
            // The useEffect above will handle navigation. We just check for success here.
            if (admin) {
                success = true;
            }
        } else {
            success = loginKioskUser(selectedUser.id, pin);
        }

        if (!success) {
            setError('Invalid PIN. Please try again.');
            setPin('');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
        }
    };

    return (
        <div className="fixed inset-0 bg-[var(--app-bg)] bg-image-[var(--app-bg-image)] z-[100] flex items-center justify-center p-4">
            <MotionDiv 
                initial={{ scale: 0.9, y: 30, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="bg-[var(--main-bg)] rounded-2xl shadow-2xl w-full max-w-sm"
            >
                <div className="p-8 text-center">
                    <div className="mx-auto h-24 w-auto mb-6">
                        <LocalMedia src={settings.logoUrl} alt="Company Logo" type="image" className="h-full w-full object-contain" />
                    </div>
                    <h2 className="text-2xl font-bold section-heading text-[var(--main-text)]">Kiosk Access</h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Please select your user and enter the PIN.</p>
                </div>

                <MotionForm 
                    onSubmit={handleSubmit}
                    className="p-8 pt-0"
                    animate={{ x: isShaking ? [-10, 10, -10, 10, 0] : 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="mb-6">
                        <label className="block text-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select User</label>
                        <div className="grid grid-cols-2 gap-3">
                             {allUsers.map(user => (
                                <button
                                    type="button"
                                    key={user.id}
                                    onClick={() => setSelectedUser({ id: user.id, type: user.type })}
                                    className={`p-3 text-center rounded-lg font-semibold transition-all duration-200 border-2 ${
                                        selectedUser?.id === user.id
                                            ? 'bg-gray-800 text-white border-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100 shadow-lg'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-800 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:border-gray-400'
                                    }`}
                                >
                                    {user.name}
                                    {user.isMainAdmin && <span className="text-xs opacity-70 block">(Admin)</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="pin-input" className="sr-only">PIN</label>
                            <input
                                id="pin-input"
                                type="password"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                placeholder="****"
                                maxLength={4}
                                pattern="\d{4}"
                                className="block w-full text-center tracking-[1em] text-2xl font-bold bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-3 px-4"
                                required
                                autoComplete="off"
                            />
                        </div>
                    </div>
                    
                    {error && <p className="mt-4 text-sm text-red-500 text-center">{error}</p>}

                    <div className="mt-6">
                        <button type="submit" className="btn btn-primary w-full text-lg">
                            Enter
                        </button>
                    </div>
                </MotionForm>
            </MotionDiv>
        </div>
    );
};

export default KioskLogin;
