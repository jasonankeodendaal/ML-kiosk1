import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { KioskUser } from '../../types';
import { ChevronLeftIcon, SaveIcon } from '../Icons';
import { useAppContext } from '../context/AppContext';

const inputStyle = "mt-1 block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2.5 px-4 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 sm:text-sm";

const getInitialFormData = (): KioskUser => ({
    id: `ku_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name: '',
    pin: '',
});

const AdminKioskUserEdit: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { kioskUsers, addKioskUser, updateKioskUser, loggedInUser } = useAppContext();

    const isEditing = Boolean(userId);
    const [formData, setFormData] = useState<KioskUser>(getInitialFormData());
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (isEditing && userId) {
            const user = kioskUsers.find(u => u.id === userId);
            if (user) {
                setFormData(user);
            }
        } else {
            setFormData(getInitialFormData());
        }
    }, [userId, kioskUsers, isEditing]);

    const canManage = loggedInUser?.isMainAdmin || loggedInUser?.permissions.canManageKioskUsers;
    if (!canManage) {
        return (
            <div className="text-center py-10">
                <h2 className="text-2xl font-bold section-heading">Access Denied</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">You do not have permission to manage kiosk users.</p>
                <Link to="/admin" className="text-blue-500 dark:text-blue-400 hover:underline mt-4 inline-block">Go back to dashboard</Link>
            </div>
        );
    }
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // For PIN, only allow numbers
        const finalValue = name === 'pin' ? value.replace(/\D/g, '') : value;
        setFormData({ ...formData, [name]: finalValue });
    };
    
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if(!formData.name || !formData.pin) {
            alert('Please fill out Name and PIN.');
            return;
        }
        if (!/^\d{4}$/.test(formData.pin)) {
            alert('PIN must be exactly 4 digits.');
            return;
        }

        const pinExists = kioskUsers.some(u => u.pin === formData.pin && u.id !== formData.id);
        if (pinExists) {
            alert('This PIN is already in use. Please choose another.');
            return;
        }

        setSaving(true);
        if (isEditing) {
            updateKioskUser(formData);
        } else {
            addKioskUser(formData);
        }
        
        setTimeout(() => {
            setSaving(false);
            if(isEditing){
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            } else {
                navigate(`/admin/kiosk-user/edit/${formData.id}`, { replace: true });
            }
        }, 300);
    };
    
    return (
        <form onSubmit={handleSave} className="space-y-8 max-w-2xl mx-auto">
            <div>
                <Link to="/admin" className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4">
                    <ChevronLeftIcon className="h-5 w-5 mr-1" />
                    Back to Dashboard
                </Link>
                <div className="md:flex md:items-center md:justify-between">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-3xl font-bold leading-7 text-gray-900 dark:text-gray-100 sm:truncate section-heading">
                            {isEditing ? 'Edit Kiosk User' : 'Create New Kiosk User'}
                        </h2>
                    </div>
                    <div className="mt-4 flex md:mt-0 md:ml-4">
                         <button
                            type="submit"
                            disabled={saving || saved}
                            className={`btn btn-primary ${saved ? 'bg-green-600 hover:bg-green-600' : ''}`}
                        >
                            <SaveIcon className="h-4 w-4" />
                            {saving ? 'Saving...' : (saved ? 'Saved!' : 'Save User')}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800/50 p-6 rounded-2xl shadow-xl border dark:border-gray-700/50">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 section-heading">User Details</h3>
                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="sm:col-span-1">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">User's Name</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} className={inputStyle} required />
                    </div>
                    <div className="sm:col-span-1">
                        <label htmlFor="pin" className="block text-sm font-medium text-gray-700 dark:text-gray-300">4-Digit PIN</label>
                        <input type="password" name="pin" id="pin" value={formData.pin} onChange={handleInputChange} className={inputStyle} required maxLength={4} pattern="[0-9]{4}" title="PIN must be 4 digits" />
                    </div>
                </div>
            </div>
        </form>
    );
};

export default AdminKioskUserEdit;
