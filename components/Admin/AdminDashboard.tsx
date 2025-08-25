import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AdminSettings from './AdminSettings.tsx';
import AdminScreensaverAds from './AdminScreensaverAds.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import AdminStorage from './AdminStorage.tsx';
import { PlusIcon, BookOpenIcon, DocumentTextIcon, EyeIcon, TvIcon, TrashIcon, PencilIcon } from '../Icons.tsx';
import AdminUserManagement from './AdminUserManagement.tsx';
import AdminTrash from './AdminTrash.tsx';
import AdminPdfConverter from './AdminPdfConverter.tsx';
import AdminAnalytics from './AdminAnalytics.tsx';
import ClientsView from '../ClientsView.tsx';
import AdminFooter from './AdminFooter.tsx';
import AdminHeader from './AdminHeader.tsx';
import AdminBrandContent from './AdminBrandContent.tsx';
import type { Brand, Catalogue, Pamphlet, TvContent } from '../../types.ts';
import LocalMedia from '../LocalMedia.tsx';

export type AdminSection = 'brands' | 'content' | 'kiosk' | 'settings' | 'storage' | 'users' | 'trash' | 'pdfConverter' | 'analytics' | 'client-orders';

const AdminDashboard: React.FC = () => {
    const [activeSection, setActiveSection] = useState<AdminSection>('brands');
    const [activeBulkImportTab, setActiveBulkImportTab] = useState<'csv' | 'zip'>('csv');
    const [activeContentTab, setActiveContentTab] = useState<'catalogues' | 'pamphlets'>('catalogues');
    const [activeKioskTab, setActiveKioskTab] = useState<'screensaver' | 'tv'>('screensaver');

    const { loggedInUser } = useAppContext();
    const perms = loggedInUser?.permissions;
    const canManageBrands = !!(loggedInUser?.isMainAdmin || perms?.canManageBrandsAndProducts);

    const renderContent = () => {
        switch (activeSection) {
            case 'brands': return <AdminBrandContent canManageBrands={canManageBrands} activeBulkImportTab={activeBulkImportTab} setActiveBulkImportTab={setActiveBulkImportTab} />;
            case 'content': 
                return (
                    <div>
                        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                <button onClick={() => setActiveContentTab('catalogues')} className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${activeContentTab === 'catalogues' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Catalogues</button>
                                <button onClick={() => setActiveContentTab('pamphlets')} className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${activeContentTab === 'pamphlets' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Pamphlets</button>
                            </nav>
                        </div>
                        {activeContentTab === 'catalogues' && <AdminCatalogueContent />}
                        {activeContentTab === 'pamphlets' && <AdminPamphletContent />}
                    </div>
                );
            case 'kiosk':
                 return (
                    <div>
                        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                <button onClick={() => setActiveKioskTab('screensaver')} className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${activeKioskTab === 'screensaver' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Screensaver Ads</button>
                                <button onClick={() => setActiveKioskTab('tv')} className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${activeKioskTab === 'tv' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>TV Content</button>
                            </nav>
                        </div>
                        {activeKioskTab === 'screensaver' && <AdminScreensaverAds />}
                        {activeKioskTab === 'tv' && <AdminTvContent />}
                    </div>
                );
            case 'client-orders': return <ClientsView />;
            case 'analytics': return <AdminAnalytics />;
            case 'pdfConverter': return <AdminPdfConverter />;
            case 'settings': return <AdminSettings />;
            case 'storage': return <AdminStorage />;
            case 'users': return <AdminUserManagement />;
            case 'trash': return <AdminTrash />;
            default: return null;
        }
    }

    return (
        <div className="relative h-full flex flex-col">
            <AdminHeader />
            <main className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 pt-[90px] sm:pt-[100px] pb-[120px] sm:pb-[140px]">
                <div className="bg-white/90 dark:bg-gray-800/70 backdrop-blur-xl p-6 rounded-2xl shadow-xl border dark:border-gray-700/50">
                    {renderContent()}
                </div>
            </main>
            <AdminFooter activeSection={activeSection} setActiveSection={setActiveSection} />
        </div>
    );
};

// Sub-components for cleaner rendering logic

const getStatus = (item: Catalogue | Pamphlet) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if ('startDate' in item) { // It's a Pamphlet
        const startDate = new Date(item.startDate);
        const endDate = new Date(item.endDate);
        startDate.setMinutes(startDate.getMinutes() + startDate.getTimezoneOffset());
        endDate.setMinutes(endDate.getMinutes() + endDate.getTimezoneOffset());
        endDate.setHours(23, 59, 59, 999);

        if (endDate < today) return { text: 'Expired', color: 'bg-gray-500' };
        if (startDate > today) return { text: 'Upcoming', color: 'bg-blue-500' };
        return { text: 'Active', color: 'bg-green-500' };
    } else { // It's a Catalogue
        const currentYear = today.getFullYear();
        if (item.year < currentYear) return { text: 'Archived', color: 'bg-gray-500' };
        return { text: 'Current', color: 'bg-green-500' };
    }
};

const AdminContentCard: React.FC<{
    item: Catalogue | Pamphlet;
    type: 'catalogue' | 'pamphlet';
    onDelete: (id: string, title: string) => void;
    allBrands?: Brand[];
    canEdit: boolean;
}> = ({ item, type, onDelete, allBrands, canEdit }) => {
    const navigate = useNavigate();
    const { text: statusText, color: statusColor } = getStatus(item);
    const imageUrl = 'thumbnailUrl' in item ? item.thumbnailUrl : item.imageUrl;
    const brandName = allBrands && 'brandId' in item && item.brandId ? allBrands.find(b => b.id === item.brandId)?.name : null;
    const itemTitle = item.title;

    return (
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 border border-gray-200/80 dark:border-gray-700/50">
            <div className="relative cursor-pointer" onClick={() => canEdit && navigate(`/admin/${type}/edit/${item.id}`)}>
                <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-700">
                    <LocalMedia src={imageUrl} alt={itemTitle} type="image" className="w-full h-full object-cover" />
                </div>
                <span className={`absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-full text-white ${statusColor} shadow-md`}>
                    {statusText}
                </span>
            </div>
            <div className="p-4 flex-grow">
                <h4 className="font-bold item-title truncate text-gray-800 dark:text-gray-100" title={itemTitle}>{itemTitle}</h4>
                {'year' in item ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{brandName ? `${brandName} - ${item.year}` : item.year}</p>
                ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.startDate} to {item.endDate}</p>
                )}
            </div>
             {canEdit && (
                <div className="p-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-1">
                    <button
                        onClick={() => navigate(`/admin/${type}/edit/${item.id}`)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title={`Edit ${itemTitle}`}
                    >
                        <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onDelete(item.id, itemTitle)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title={`Delete ${itemTitle}`}
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
};

const ContentGrid: React.FC<{ title: string; items: (Catalogue[] | Pamphlet[]); type: 'catalogue' | 'pamphlet'; onDelete: (id: string, title: string) => void; allBrands?: Brand[], canEdit: boolean }> = ({ title, items, type, onDelete, allBrands, canEdit }) => {
    if (items.length === 0) return null;
    return (
        <div>
            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 section-heading">{title}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {items.map(item => (
                    <AdminContentCard key={item.id} item={item} type={type} onDelete={onDelete} allBrands={allBrands} canEdit={canEdit} />
                ))}
            </div>
        </div>
    )
}

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; message: string; ctaText: string; ctaLink: string; canAdd: boolean; }> = ({ icon, title, message, ctaText, ctaLink, canAdd }) => (
    <div className="text-center py-12 bg-white dark:bg-gray-800/50 rounded-2xl shadow-inner border border-gray-200 dark:border-gray-700/50">
         <div className="mx-auto h-12 w-12 text-gray-400">{icon}</div>
         <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
        {canAdd && (
            <div className="mt-6">
                <Link to={ctaLink} className="btn btn-primary">
                    <PlusIcon className="h-4 w-4" />
                    <span>{ctaText}</span>
                </Link>
            </div>
        )}
    </div>
);

const AdminCatalogueContent: React.FC = () => {
    const { catalogues, brands, deleteCatalogue, showConfirmation, loggedInUser } = useAppContext();
    const canManageCatalogues = loggedInUser?.isMainAdmin || loggedInUser?.permissions.canManageCatalogues;
    
    const handleDeleteCatalogue = (id: string, title: string) => {
        showConfirmation(`Are you sure you want to move the catalogue "${title}" to the trash?`, () => deleteCatalogue(id));
    };

    const visibleCatalogues = catalogues.filter(c => !c.isDeleted);
    if (visibleCatalogues.length === 0) {
        return <EmptyState icon={<BookOpenIcon className="w-full h-full" />} title="No Catalogues Found" message="Upload your first digital catalogue." ctaText="Add New Catalogue" ctaLink="/admin/catalogue/new" canAdd={!!canManageCatalogues} />;
    }
    const currentYear = new Date().getFullYear();
    const currentCatalogues = visibleCatalogues.filter(c => c.year === currentYear).sort((a,b) => a.title.localeCompare(b.title));
    const expiredCatalogues = visibleCatalogues.filter(c => c.year < currentYear).sort((a,b) => b.year - a.year || a.title.localeCompare(b.title));
    
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl text-gray-800 dark:text-gray-100 section-heading">Manage Catalogues</h3>
                {canManageCatalogues && (<Link to="/admin/catalogue/new" className="btn btn-primary"><PlusIcon className="h-4 w-4" /><span>Add New</span></Link>)}
            </div>
            <ContentGrid title={`Current Catalogues (${currentYear})`} items={currentCatalogues} type="catalogue" onDelete={handleDeleteCatalogue} allBrands={brands} canEdit={!!canManageCatalogues} />
            <ContentGrid title="Archived Catalogues" items={expiredCatalogues} type="catalogue" onDelete={handleDeleteCatalogue} allBrands={brands} canEdit={!!canManageCatalogues} />
        </div>
    );
}

const AdminPamphletContent: React.FC = () => {
    const { pamphlets, deletePamphlet, showConfirmation, loggedInUser } = useAppContext();
    const canManagePamphlets = loggedInUser?.isMainAdmin || loggedInUser?.permissions.canManagePamphlets;

    const handleDeletePamphlet = (id: string, title: string) => {
        showConfirmation(`Are you sure you want to move the pamphlet "${title}" to the trash?`, () => deletePamphlet(id));
    };
    
    const visiblePamphlets = pamphlets.filter(p => !p.isDeleted);
    if (visiblePamphlets.length === 0) {
        return <EmptyState icon={<DocumentTextIcon className="w-full h-full" />} title="No Pamphlets Found" message="Create your first promotional pamphlet." ctaText="Add New Pamphlet" ctaLink="/admin/pamphlet/new" canAdd={!!canManagePamphlets} />;
    }
    const todayPamphlet = new Date();
    todayPamphlet.setHours(0, 0, 0, 0);

    const activePamphlets = visiblePamphlets.filter(p => new Date(p.endDate) >= todayPamphlet && new Date(p.startDate) <= todayPamphlet).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    const upcomingPamphlets = visiblePamphlets.filter(p => new Date(p.startDate) > todayPamphlet).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    const expiredPamphlets = visiblePamphlets.filter(p => new Date(p.endDate) < todayPamphlet).sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl text-gray-800 dark:text-gray-100 section-heading">Manage Pamphlets</h3>
                {canManagePamphlets && (<Link to="/admin/pamphlet/new" className="btn btn-primary"><PlusIcon className="h-4 w-4" /><span>Add New</span></Link>)}
            </div>
            <ContentGrid title="Active Pamphlets" items={activePamphlets} type="pamphlet" onDelete={handleDeletePamphlet} canEdit={!!canManagePamphlets} />
            <ContentGrid title="Upcoming Pamphlets" items={upcomingPamphlets} type="pamphlet" onDelete={handleDeletePamphlet} canEdit={!!canManagePamphlets} />
            <ContentGrid title="Expired Pamphlets" items={expiredPamphlets} type="pamphlet" onDelete={handleDeletePamphlet} canEdit={!!canManagePamphlets} />
        </div>
    );
};

const AdminTvContent: React.FC = () => {
    const { tvContent, brands, deleteTvContent, showConfirmation, loggedInUser } = useAppContext();
    const navigate = useNavigate();
    const canManageTvContent = loggedInUser?.isMainAdmin || loggedInUser?.permissions.canManageTvContent;

    const handleDeleteTvContent = (id: string, modelName: string) => {
        showConfirmation(`Are you sure you want to move the TV content for "${modelName}" to the trash?`, () => deleteTvContent(id));
    };

    const visibleTvContent = tvContent.filter(tc => !tc.isDeleted);
    const groupedByBrand = visibleTvContent.reduce((acc, content) => {
        const brandName = brands.find(b => b.id === content.brandId)?.name || 'Unknown Brand';
        if (!acc[brandName]) acc[brandName] = [];
        acc[brandName].push(content);
        return acc;
    }, {} as Record<string, TvContent[]>);

    return (
        <div className="space-y-8">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl text-gray-800 dark:text-gray-100 section-heading">Manage TV Content</h3>
                {canManageTvContent && (<Link to="/admin/tv-content/new" className="btn btn-primary"><PlusIcon className="h-4 w-4" /><span>Add New</span></Link>)}
            </div>
             {Object.keys(groupedByBrand).length > 0 ? Object.entries(groupedByBrand).map(([brandName, contents]) => (
                 <div key={brandName}>
                    <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 section-heading">{brandName}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {contents.map(content => (
                            <div key={content.id} className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg border border-gray-200/80 dark:border-gray-700/50 p-4 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-800 dark:text-gray-100 truncate item-title">{content.modelName}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{content.media.length} media items</p>
                                </div>
                                {canManageTvContent && (
                                    <div className="flex items-center shrink-0">
                                            <button type="button" onClick={() => navigate(`/admin/tv-content/edit/${content.id}`)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Edit TV Content">
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button type="button" onClick={() => handleDeleteTvContent(content.id, content.modelName)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Delete TV Content">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                 </div>
             )) : (
                <EmptyState icon={<TvIcon className="w-full h-full" />} title="No TV Content Found" message="Get started by adding your first TV model content." ctaText="Add TV Content" ctaLink="/admin/tv-content/new" canAdd={!!canManageTvContent}/>
             )}
        </div>
    )
};

export default AdminDashboard;
