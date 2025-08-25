import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { CheckIcon } from '../Icons';

const SyncStatusIndicator: React.FC = () => {
    const { syncStatus, storageProvider } = useAppContext();

    if (storageProvider === 'none') {
        return null;
    }

    const providerName = storageProvider === 'local' ? 'drive' : 'cloud';

    const statusMap = {
        idle: { text: 'Status: Idle', color: 'text-gray-500 dark:text-gray-400', animate: false },
        pending: { text: 'Status: Unsaved changes', color: 'text-yellow-600 dark:text-yellow-400', animate: false },
        syncing: { text: 'Status: Syncing...', color: 'text-blue-600 dark:text-blue-400', animate: true },
        synced: { text: `Status: All changes saved to ${providerName}`, color: 'text-green-600 dark:text-green-400', animate: false },
        error: { text: 'Status: Sync Error. Please try a manual save.', color: 'text-red-600 dark:text-red-400', animate: false },
    };

    const currentStatus = statusMap[syncStatus];

    return (
        <div className="bg-white dark:bg-gray-800/50 p-3 rounded-xl shadow-md border dark:border-gray-700/50 flex items-center gap-3 text-sm">
            {currentStatus.animate ? (
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            ) : syncStatus === 'synced' ? (
                 <CheckIcon className="w-4 h-4 text-green-500" />
            ) : (
                <div className={`w-3 h-3 rounded-full ${syncStatus === 'pending' ? 'bg-yellow-500' : syncStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'}`}></div>
            )}
            <span className={currentStatus.color}>{currentStatus.text}</span>
        </div>
    );
};

const AdminBackupRestore: React.FC = () => {
    const { 
        storageProvider,
        loggedInUser,
        showConfirmation,
        saveDatabaseToLocal, loadDatabaseFromLocal,
        pushToCloud, pullFromCloud, syncStatus
    } = useAppContext();

    const [isSaving, setIsSaving] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [isPushing, setIsPushing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    
    const isSuperAdmin = loggedInUser?.isMainAdmin ?? false;

    const handleSaveToDrive = async () => {
         showConfirmation("Are you sure you want to manually save to the drive? This will overwrite the current file.", async () => {
            setIsSaving(true);
            const success = await saveDatabaseToLocal();
            if (success) alert("Data successfully saved to the connected folder.");
            setIsSaving(false);
        });
    };

    const handleLoadFromDrive = async () => {
        showConfirmation(
            "Are you sure you want to load data from the drive? This will overwrite all current local data.",
            async () => {
                setIsDataLoading(true);
                await loadDatabaseFromLocal();
                setIsDataLoading(false);
            }
        );
    };

    const handlePushToCloud = async () => {
         showConfirmation("Are you sure you want to push to the cloud? This will overwrite the current cloud data.", async () => {
            setIsPushing(true);
            const success = await pushToCloud();
             if (success) alert("Data successfully pushed to the cloud.");
            setIsPushing(false);
        });
    };

    const handlePullFromCloud = async () => {
        showConfirmation("Are you sure you want to pull from the cloud? This will overwrite all current local data.", async () => {
            setIsPulling(true);
            await pullFromCloud();
            setIsPulling(false);
        });
    };

    if (storageProvider === 'none') {
        return (
            <div className="text-center py-12 bg-white dark:bg-gray-800/50 rounded-2xl shadow-inner border border-gray-200 dark:border-gray-700/50">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No Storage Provider Connected</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Please connect a storage provider in the 'Storage' tab to sync data.</p>
            </div>
        );
    }
    
    const isCloud = storageProvider === 'customApi' || storageProvider === 'sharedUrl';
    const anyOperationInProgress = isPushing || isSaving || isDataLoading || isPulling || syncStatus === 'syncing';

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800/50 p-6 rounded-2xl shadow-xl border dark:border-gray-700/50">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold leading-6 text-gray-800 dark:text-gray-100 section-heading">Manual Sync Controls</h3>
                    <SyncStatusIndicator />
                </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    Manually push (upload) or pull (download) the entire kiosk database. This is useful for initial setup or forcing a sync.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <button type="button" onClick={isCloud ? handlePushToCloud : handleSaveToDrive} disabled={anyOperationInProgress || !isSuperAdmin} className="btn btn-primary flex-1">
                        {isPushing || isSaving ? 'Saving...' : (isCloud ? 'Push to Cloud' : 'Save to Drive')}
                    </button>
                    <button type="button" onClick={isCloud ? handlePullFromCloud : handleLoadFromDrive} disabled={anyOperationInProgress} className="btn btn-primary flex-1">
                        {isPulling || isDataLoading ? 'Loading...' : (isCloud ? 'Pull from Cloud' : 'Load from Drive')}
                    </button>
                </div>
                {!isSuperAdmin && (
                    <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 text-center">
                        Only the Main Admin can push data.
                    </p>
                )}
            </div>
        </div>
    );
};

export default AdminBackupRestore;
