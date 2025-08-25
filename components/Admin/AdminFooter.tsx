import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CircleStackIcon, BookOpenIcon, EyeIcon, TvIcon, PencilIcon,
    ServerStackIcon, UsersIcon, TrashIcon, BuildingOfficeIcon, ChevronUpIcon, XIcon, ChartPieIcon
} from '../Icons.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import type { AdminSection } from './AdminDashboard.tsx';

interface AdminFooterProps {
    activeSection: AdminSection;
    setActiveSection: (section: AdminSection) => void;
}

const NavButton: React.FC<{
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`relative flex-1 flex flex-col items-center justify-center h-16 transition-colors duration-200 ${isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}
        aria-label={label}
    >
        {icon}
        <span className="text-[10px] font-bold mt-1">{label}</span>
        {isActive && (
            <motion.div
                className="absolute bottom-1 w-1.5 h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full"
                layoutId="active-indicator"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
        )}
    </button>
);

const SubMenuButton: React.FC<{
    label: string;
    icon: React.ReactElement<any>;
    onClick: () => void;
}> = ({ label, icon, onClick }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center justify-center gap-1 text-gray-700 dark:text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors w-16"
        aria-label={label}
    >
        <div className="flex items-center justify-center h-10 w-10 bg-gray-100 dark:bg-gray-700/50 rounded-xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
            {React.cloneElement(icon, { className: "h-5 w-5" })}
        </div>
        <span className="text-[10px] font-medium">{label}</span>
    </button>
);


const AdminFooter: React.FC<AdminFooterProps> = ({ activeSection, setActiveSection }) => {
    const { loggedInUser } = useAppContext();
    const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);

    const perms = loggedInUser?.permissions;

    const navItems: { section: AdminSection; label: string; icon: React.ReactNode; isVisible: boolean }[] = [
        { section: 'brands', label: 'Brands', icon: <CircleStackIcon className="h-6 w-6" />, isVisible: !!(loggedInUser?.isMainAdmin || perms?.canManageBrandsAndProducts) },
        { section: 'content', label: 'Content', icon: <BookOpenIcon className="h-6 w-6" />, isVisible: !!(loggedInUser?.isMainAdmin || perms?.canManageCatalogues || perms?.canManagePamphlets) },
        { section: 'kiosk', label: 'Kiosk', icon: <TvIcon className="h-6 w-6" />, isVisible: !!(loggedInUser?.isMainAdmin || perms?.canManageScreensaver || perms?.canManageTvContent) },
        { section: 'settings', label: 'Settings', icon: <PencilIcon className="h-6 w-6" />, isVisible: !!(loggedInUser?.isMainAdmin || perms?.canManageSettings) },
    ];
    
    const subMenuItems: { section: AdminSection; label: string; icon: React.ReactElement<any>; isVisible: boolean }[] = [
        { section: 'storage', label: 'Storage', icon: <ServerStackIcon className="h-6 w-6" />, isVisible: !!(loggedInUser?.isMainAdmin || perms?.canManageSystem) },
        { section: 'users', label: 'Users', icon: <UsersIcon className="h-6 w-6" />, isVisible: !!(loggedInUser?.isMainAdmin || perms?.canManageKioskUsers) },
        { section: 'analytics', label: 'Analytics', icon: <ChartPieIcon className="h-6 w-6" />, isVisible: !!(loggedInUser?.isMainAdmin || perms?.canViewAnalytics) },
        { section: 'client-orders', label: 'Quotes', icon: <BuildingOfficeIcon className="h-6 w-6" />, isVisible: !!(loggedInUser?.isMainAdmin || perms?.canManageClientOrders) },
        { section: 'trash', label: 'Trash', icon: <TrashIcon className="h-6 w-6" />, isVisible: !!(loggedInUser?.isMainAdmin || perms?.canManageSystem) },
    ];

    const visibleNavItems = navItems.filter(item => item.isVisible);

    return (
        <>
            <AnimatePresence>
                {isSubMenuOpen && (
                     <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setIsSubMenuOpen(false)}
                    />
                )}
            </AnimatePresence>

            <footer className="fixed bottom-0 left-0 right-0 h-[120px] flex items-end justify-center z-50 pointer-events-none sm:px-4">
                 <div className="w-full max-w-md mx-auto pointer-events-auto flex flex-col items-center">
                    <AnimatePresence>
                        {isSubMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                className="absolute bottom-[95px] left-1/2 -translate-x-1/2 w-auto bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-full p-2 shadow-2xl flex items-center justify-center gap-2"
                            >
                                 {subMenuItems.filter(item => item.isVisible).map(item => (
                                    <SubMenuButton 
                                        key={item.section}
                                        label={item.label}
                                        icon={item.icon}
                                        onClick={() => {
                                            setActiveSection(item.section);
                                            setIsSubMenuOpen(false);
                                        }}
                                    />
                                 ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.div 
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.2 }}
                        className="relative h-20 w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-2xl rounded-t-3xl sm:rounded-3xl"
                    >
                         <div className="flex justify-around items-center h-full">
                            {visibleNavItems.slice(0, 2).map(item => (
                                <NavButton key={item.section} {...item} isActive={activeSection === item.section} onClick={() => setActiveSection(item.section)} />
                            ))}
                            
                            <div className="relative -top-6">
                                <button
                                    onClick={() => setIsSubMenuOpen(!isSubMenuOpen)}
                                    className="h-16 w-16 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105"
                                >
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={isSubMenuOpen ? 'close' : 'open'}
                                            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                                            animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {isSubMenuOpen ? <XIcon className="h-7 w-7" /> : <ChevronUpIcon className="h-7 w-7" />}
                                        </motion.div>
                                    </AnimatePresence>
                                </button>
                            </div>

                             {visibleNavItems.slice(2).map(item => (
                                <NavButton key={item.section} {...item} isActive={activeSection === item.section} onClick={() => setActiveSection(item.section)} />
                            ))}
                        </div>
                    </motion.div>
                </div>
            </footer>
        </>
    );
};

export default AdminFooter;
