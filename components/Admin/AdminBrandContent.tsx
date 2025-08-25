import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { PlusIcon, PencilIcon, TrashIcon, CircleStackIcon, ChevronDownIcon } from '../Icons';
import AdminBulkImport from './AdminBulkImport';
import AdminZipBulkImport from './AdminZipBulkImport';
import LocalMedia from '../LocalMedia';

interface AdminBrandContentProps {
    canManageBrands: boolean;
    activeBulkImportTab: 'csv' | 'zip';
    setActiveBulkImportTab: (tab: 'csv' | 'zip') => void;
}

const AdminBrandContent: React.FC<AdminBrandContentProps> = ({ canManageBrands, activeBulkImportTab, setActiveBulkImportTab }) => {
    const navigate = useNavigate();
    const { brands, products, deleteBrand, showConfirmation } = useAppContext();

    const handleDeleteBrand = (brandId: string, brandName: string) => {
        showConfirmation(
            `Are you sure you want to move the brand "${brandName}" to the trash? Associated products will be hidden but not deleted.`,
            () => deleteBrand(brandId)
        );
    };
    
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

    const visibleBrands = brands.filter(b => !b.isDeleted);
    
    return (
        <div className="space-y-8">
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl text-gray-800 dark:text-gray-100 section-heading">Manage Brands</h3>
                    {canManageBrands && (
                        <Link to="/admin/brand/new" className="btn btn-primary">
                            <PlusIcon className="h-4 w-4" />
                            <span>Add New Brand</span>
                        </Link>
                    )}
                </div>
                {visibleBrands.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {visibleBrands.map(brand => (
                            <div key={brand.id} className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg border border-gray-200/80 dark:border-gray-700/50 p-4 flex items-center justify-between gap-4 transition-all hover:shadow-xl hover:-translate-y-1">
                                <div className="flex items-center gap-4 cursor-pointer flex-1 min-w-0" onClick={() => navigate(`/admin/brand/${brand.id}`)}>
                                    <div className="h-16 w-16 flex items-center justify-center">
                                        <LocalMedia
                                            src={brand.logoUrl}
                                            alt={brand.name}
                                            type="image"
                                            className="max-h-full max-w-full object-contain"
                                            onError={(e) => { const target = e.target as HTMLImageElement; target.onerror = null; target.src=`https://placehold.co/100x100/E2E8F0/4A5568?text=${brand.name.charAt(0)}`; }}
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-800 dark:text-gray-100 truncate item-title">{brand.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{products.filter(p => p.brandId === brand.id && !p.isDiscontinued && !p.isDeleted).length} products</p>
                                    </div>
                                </div>
                                {canManageBrands && (
                                    <div className="flex items-center shrink-0">
                                        <button type="button" onClick={() => navigate(`/admin/brand/edit/${brand.id}`)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Edit Brand">
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button type="button" onClick={() => handleDeleteBrand(brand.id, brand.name)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Delete Brand">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState icon={<CircleStackIcon className="w-full h-full" />} title="No Brands Found" message="Get started by adding your first brand." ctaText="Add New Brand" ctaLink="/admin/brand/new" canAdd={!!canManageBrands}/>
                )}
            </div>
            {canManageBrands && (
                    <details className="group bg-white dark:bg-gray-800/50 rounded-2xl shadow-xl overflow-hidden border border-gray-200/80 dark:border-gray-700/50">
                    <summary className="flex items-center justify-between p-4 sm:p-5 cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center gap-3">
                            <CircleStackIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 section-heading">Bulk Import Products</h3>
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-transform duration-300 transform group-open:rotate-180">
                            <ChevronDownIcon className="w-5 h-5"/>
                        </div>
                    </summary>
                    <div className="px-4 sm:px-5 py-6 border-t border-gray-200/80 dark:border-gray-700">
                        <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                <button
                                    type="button"
                                    onClick={() => setActiveBulkImportTab('csv')}
                                    className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${activeBulkImportTab === 'csv' ? 'border-gray-800 dark:border-gray-100 text-gray-800 dark:text-gray-100' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'}`}
                                >
                                    CSV Upload
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveBulkImportTab('zip')}
                                    className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${activeBulkImportTab === 'zip' ? 'border-gray-800 dark:border-gray-100 text-gray-800 dark:text-gray-100' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'}`}
                                >
                                    Zip Upload
                                </button>
                            </nav>
                        </div>
                        {activeBulkImportTab === 'csv' && <AdminBulkImport />}
                        {activeBulkImportTab === 'zip' && <AdminZipBulkImport />}
                    </div>
                </details>
            )}
        </div>
    );
};

export default AdminBrandContent;
