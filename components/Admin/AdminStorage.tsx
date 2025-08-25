import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import type { BackupData } from '../../types';
import { Link } from 'react-router-dom';
import { ServerStackIcon, ChevronDownIcon, ArchiveBoxArrowDownIcon, LinkIcon, UploadIcon, DocumentArrowDownIcon } from '../Icons';

const CodeBracketIcon = ({ className = 'w-6 h-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
);

const ProviderCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    children?: React.ReactNode;
    disabled?: boolean;
}> = ({ icon, title, description, children, disabled = false }) => (
    <div className={`bg-white dark:bg-gray-800/50 p-6 rounded-2xl shadow-xl border dark:border-gray-700/50 flex flex-col items-center text-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <div className="flex-shrink-0 flex items-center justify-center h-16 w-16 rounded-2xl bg-gray-800 dark:bg-gray-700 text-white mb-4">
            {icon}
        </div>
        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 section-heading">{title}</h4>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 flex-grow">{description}</p>
        <div className="mt-6 w-full">
            {children}
        </div>
    </div>
);

const ConnectedCard: React.FC<{ icon: React.ReactNode; title: string; onDisconnect: () => void; name?: string; }> = ({ icon, title, onDisconnect, name }) => {
    
    return (
    <div className="bg-white dark:bg-gray-800/50 p-6 rounded-2xl shadow-xl border border-green-300 dark:border-green-700">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="flex-shrink-0 flex items-center justify-center h-16 w-16 rounded-2xl bg-green-600 text-white">
                {icon}
            </div>
            <div className="flex-grow min-w-0">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 section-heading">Connected to {title}</h4>
                <p className="mt-1 text-sm text-green-700 dark:text-green-400 font-medium truncate" title={name}>
                    {name ? `Active: ${name}` : `Your assets are managed by ${title}.`}
                </p>
            </div>
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
                <button onClick={onDisconnect} className="btn btn-destructive">
                    Disconnect
                </button>
            </div>
        </div>
    </div>
    )
};

const SetupInstruction: React.FC<{ title: string, children: React.ReactNode, id?: string, defaultOpen?: boolean }> = ({ title, children, id, defaultOpen = false }) => (
    <details id={id} className="group bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg overflow-hidden border dark:border-gray-700/50" open={defaultOpen}>
        <summary className="flex items-center justify-between p-4 cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 section-heading">{title}</h4>
            <div className="text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-transform duration-300 transform group-open:rotate-180">
                <ChevronDownIcon className="w-5 h-5"/>
            </div>
        </summary>
        <div className="px-5 py-4 border-t border-gray-200/80 dark:border-gray-700/50 prose prose-sm dark:prose-invert max-w-none prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-code:bg-gray-200 prose-code:dark:bg-gray-700 prose-code:p-1 prose-code:rounded-md prose-code:font-mono prose-strong:text-gray-800 dark:prose-strong:text-gray-100">
            {children}
        </div>
    </details>
);

const AdminStorage: React.FC = () => {
    const { 
        storageProvider, 
        loggedInUser,
        brands, products, catalogues, pamphlets, settings, screensaverAds, adminUsers, tvContent, restoreBackup, showConfirmation, categories, viewCounts,
        connectToLocalProvider, connectToCloudProvider, connectToSharedUrl, disconnectFromStorage, directoryHandle, updateSettings
    } = useAppContext();

    const [isLoading, setIsLoading] = useState(false);
    const [isPotentiallyRestricted, setIsPotentiallyRestricted] = useState(false);
    const [sharedUrl, setSharedUrl] = useState('');
    const [fileName, setFileName] = useState<string>('');
    const [isRestoring, setIsRestoring] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const canManage = loggedInUser?.isMainAdmin || loggedInUser?.permissions.canManageSystem;

     useEffect(() => {
        if (window.self !== window.top) {
            setIsPotentiallyRestricted(true);
        }
    }, []);

    if (!canManage) {
        return (
            <div className="text-center py-10">
                <h2 className="text-2xl font-bold section-heading">Access Denied</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">You do not have permission to manage system settings.</p>
                <Link to="/admin" className="text-blue-500 dark:text-blue-400 hover:underline mt-4 inline-block">Go back to dashboard</Link>
            </div>
        );
    }
    
    // --- Provider Connection Handlers ---
    const handleLocalConnect = async () => {
        setIsLoading(true);
        await connectToLocalProvider();
        setIsLoading(false);
    };

    const handleSharedUrlConnect = () => {
        connectToSharedUrl(sharedUrl);
    };

    const getProviderDetails = () => {
        switch (storageProvider) {
            case 'local':
                return {
                    icon: <ServerStackIcon className="h-8 w-8" />,
                    title: 'Local or Network Folder',
                    name: directoryHandle?.name,
                };
            case 'customApi':
                return {
                    icon: <CodeBracketIcon className="h-8 w-8" />,
                    title: 'Custom API Sync',
                    name: 'Remote cloud sync active',
                };
            case 'sharedUrl':
                 return {
                    icon: <LinkIcon className="h-8 w-8" />,
                    title: 'Shared URL',
                    name: settings.sharedUrl,
                };
            default: return null;
        }
    }
    
    // --- Local File Backup Handlers ---
    const handleCreateBackup = () => {
        const backupData: BackupData = { brands, products, catalogues, pamphlets, settings, screensaverAds, adminUsers, tvContent, categories, viewCounts };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        const date = new Date().toISOString().split('T')[0];
        link.download = `kiosk-backup-${date}.json`;
        link.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFileName(e.target.files[0].name);
        } else {
            setFileName('');
        }
    };
    
    const handleRestore = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fileInput = fileInputRef.current;
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            alert('Please select a backup file to restore.');
            return;
        }
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const result = event.target?.result;
                if (typeof result !== 'string') throw new Error("Failed to read file.");
                const data = JSON.parse(result);
                if (!data.brands || !data.products || !data.settings) throw new Error("Invalid backup file format.");
                
                showConfirmation("Are you sure you want to restore? This will overwrite all current data.", () => {
                    setIsRestoring(true);
                    restoreBackup(data);
                    setTimeout(() => {
                        alert("Restore successful!");
                        setFileName('');
                        if (fileInputRef.current) fileInputRef.current.value = "";
                        setIsRestoring(false);
                    }, 100);
                });

            } catch (error) {
                alert(`Error restoring backup: ${error instanceof Error ? error.message : "Unknown error"}`);
                setIsRestoring(false);
            }
        };
        reader.readAsText(file);
    };

    const renderProviderSelection = () => (
        <>
            <h3 className="text-xl text-gray-800 dark:text-gray-100 section-heading">Connect a Storage Provider</h3>
             {isPotentiallyRestricted && (
                 <div className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-300 p-4 rounded-r-lg">
                    <p className="font-bold">Potential Restriction Detected</p>
                    <p className="text-sm mt-1">It looks like this app is running in an embedded window. Due to browser security, "Local Folder" storage might be disabled.</p>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                <ProviderCard icon={<ServerStackIcon className="h-8 w-8" />} title="Local or Network Folder" description="Store all assets and data in a folder on your computer or a shared network drive. Ideal for offline use or manual syncing." disabled={isPotentiallyRestricted || isLoading}>
                    <button onClick={handleLocalConnect} className="btn btn-primary w-full max-w-xs mx-auto" disabled={isPotentiallyRestricted || isLoading}>
                        {isLoading ? 'Connecting...' : 'Connect to Folder'}
                    </button>
                </ProviderCard>
                <ProviderCard icon={<LinkIcon className="h-8 w-8" />} title="Shared URL / Simple API" description="Connect to a simple cloud endpoint. For read-only access, use a URL to a database.json file. For read/write, the URL must be a server endpoint that accepts POST requests." disabled={isLoading}>
                    <div className="space-y-2">
                        <input type="url" value={sharedUrl} onChange={e => setSharedUrl(e.target.value)} placeholder="https://.../database.json" className="block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 text-sm"/>
                        <button onClick={handleSharedUrlConnect} className="btn btn-primary w-full max-w-xs mx-auto" disabled={isLoading || !sharedUrl}>
                            {isLoading ? 'Connecting...' : 'Connect to URL'}
                        </button>
                    </div>
                </ProviderCard>
                 <ProviderCard icon={<CodeBracketIcon className="h-8 w-8" />} title="Custom API Sync" description="For advanced users. Sync data with your own backend API (e.g., Node.js with Redis, MongoDB, etc.)." disabled={isLoading}>
                    <button onClick={() => connectToCloudProvider('customApi')} className="btn btn-primary w-full max-w-xs mx-auto" disabled={isLoading}>
                        Connect
                    </button>
                </ProviderCard>
            </div>
        </>
    );

    const providerDetails = getProviderDetails();
    
    return (
        <div className="space-y-8">
            <h3 className="text-xl text-gray-800 dark:text-gray-100 section-heading">Storage & Sync</h3>
            
            <div className="bg-white dark:bg-gray-800/50 p-6 rounded-2xl shadow-xl border dark:border-gray-700/50">
                <div className="flex justify-between items-center">
                    <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-100">Enable Auto-Sync</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Automatically save and receive updates when connected to a storage provider.</p>
                    </div>
                     <label htmlFor="autoSyncEnabled" className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input type="checkbox" id="autoSyncEnabled" className="sr-only peer" checked={settings.sync?.autoSyncEnabled ?? false} onChange={(e) => updateSettings({ sync: { ...settings.sync, autoSyncEnabled: e.target.checked }})}/>
                            <div className="block w-14 h-8 rounded-full transition-colors bg-gray-300 dark:bg-gray-600 peer-checked:bg-indigo-500"></div>
                            <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-6"></div>
                        </div>
                    </label>
                </div>
            </div>
            
            {storageProvider === 'none' ? renderProviderSelection() : (providerDetails && <ConnectedCard {...providerDetails} onDisconnect={() => disconnectFromStorage()} />)}

            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-gray-300 dark:border-gray-600" /></div>
                <div className="relative flex justify-center"><span className="bg-gray-100/50 dark:bg-gray-800/20 px-3 text-base font-medium text-gray-700 dark:text-gray-300">Local File Backup</span></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ProviderCard icon={<DocumentArrowDownIcon className="h-8 w-8" />} title="Create Backup File" description="Download a complete .json backup of all application data to your computer. Store this file in a safe place.">
                    <button type="button" onClick={handleCreateBackup} className="btn btn-primary">Download Backup File</button>
                </ProviderCard>
                <ProviderCard icon={<UploadIcon className="h-8 w-8" />} title="Restore from Backup File" description="Restore the application state from a backup file. Warning: This will overwrite all current data.">
                    <form onSubmit={handleRestore} className="space-y-3">
                        <label htmlFor="restore-file-upload" className="btn bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 w-full">
                            {fileName || 'Select File...'}
                        </label>
                        <input ref={fileInputRef} id="restore-file-upload" type="file" className="sr-only" accept=".json" onChange={handleFileChange} />
                        <button type="submit" className="btn btn-destructive w-full" disabled={isRestoring || !fileName}>{isRestoring ? 'Restoring...' : 'Restore from Backup'}</button>
                    </form>
                </ProviderCard>
            </div>
             <SetupInstruction title="Need help setting up a server?">
                <p>For multi-device sync, you need a central server. We provide a simple server that's easy to set up.</p>
                <p>Full instructions are in the <strong>README.md</strong> file included with the project, or you can find them in the <code>Storage & Sync</code> section of the admin panel after installation.</p>
                <Link to="/admin" onClick={(e) => { e.preventDefault(); const el = document.getElementById('storage-setup-guide'); if(el) el.setAttribute('open', 'true'); }} className="font-semibold">Click here to view the setup guide.</Link>
            </SetupInstruction>
        </div>
    );
};

export default AdminStorage;
