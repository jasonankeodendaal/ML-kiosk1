import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from './context/AppContext.tsx';
import { ChevronLeftIcon, SearchIcon, ClipboardDocumentListIcon, ChevronDownIcon } from './Icons.tsx';
import LocalMedia from './LocalMedia.tsx';
import type { Product, OrderItem, Order, Brand, Category } from '../types.ts';

interface GroupedProducts {
    [brandId: string]: {
        brand: Brand;
        categories: {
            category: Category;
            products: Product[];
        }[];
        uncategorized: Product[];
    };
}

const ProductRow: React.FC<{
    product: Product;
    isSelected: boolean;
    quantity: number;
    onToggle: (id: string) => void;
    onQuantityChange: (id: string, qty: number) => void;
}> = ({ product, isSelected, quantity, onToggle, onQuantityChange }) => (
    <div className={`p-4 flex items-center gap-4 transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
        <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggle(product.id)}
            className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
        />
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
            <LocalMedia src={product.images[0]} alt={product.name} type="image" className="w-full h-full object-cover" />
        </div>
        <div className="flex-grow min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate item-title">{product.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-mono">{product.sku}</span>
            </p>
        </div>
        <div className="flex-shrink-0">
            <label htmlFor={`qty-${product.id}`} className="sr-only">Quantity</label>
            <input
                type="number"
                id={`qty-${product.id}`}
                value={quantity || ''}
                onChange={(e) => onQuantityChange(product.id, parseInt(e.target.value, 10))}
                onClick={() => !isSelected && onToggle(product.id)}
                placeholder="Qty"
                min="1"
                className="w-20 text-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-1.5 px-2"
            />
        </div>
    </div>
);


const StockPick: React.FC = () => {
    const { products, brands, categories, addOrder, loggedInUser } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
    const location = useLocation();
    const navigate = useNavigate();
    const clientId = location.state?.clientId;

    useEffect(() => {
        if (!clientId) {
            alert("No client selected. Redirecting to home.");
            navigate('/');
        }
    }, [clientId, navigate]);

    const groupedAndFilteredProducts = useMemo(() => {
        const activeProducts = products.filter(p => !p.isDeleted && !p.isDiscontinued);
        
        const filtered = !searchTerm ? activeProducts : activeProducts.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const grouped: GroupedProducts = {};

        for (const product of filtered) {
            const brand = brands.find(b => b.id === product.brandId && !b.isDeleted);
            if (!brand) continue;

            if (!grouped[brand.id]) {
                grouped[brand.id] = {
                    brand,
                    categories: [],
                    uncategorized: []
                };
            }

            const category = categories.find(c => c.id === product.categoryId && !c.isDeleted);
            if (category) {
                let categoryGroup = grouped[brand.id].categories.find(c => c.category.id === category.id);
                if (!categoryGroup) {
                    categoryGroup = { category, products: [] };
                    grouped[brand.id].categories.push(categoryGroup);
                }
                categoryGroup.products.push(product);
            } else {
                grouped[brand.id].uncategorized.push(product);
            }
        }
        
        // Sort categories within each brand
        Object.values(grouped).forEach(brandData => {
            brandData.categories.sort((a, b) => a.category.name.localeCompare(b.category.name));
        });

        return Object.values(grouped).sort((a,b) => a.brand.name.localeCompare(b.brand.name));

    }, [products, brands, categories, searchTerm]);

    const handleToggle = (productId: string) => {
        setSelectedItems(prev => {
            const newSelection = { ...prev };
            if (newSelection[productId]) {
                delete newSelection[productId];
            } else {
                newSelection[productId] = 1;
            }
            return newSelection;
        });
    };

    const handleQuantityChange = (productId: string, quantity: number) => {
        if (quantity > 0) {
            setSelectedItems(prev => ({ ...prev, [productId]: quantity }));
        } else {
             handleToggle(productId); // Remove if quantity is 0 or less
        }
    };

    const handleSaveOrder = () => {
        const orderItems: OrderItem[] = Object.entries(selectedItems).map(([productId, quantity]) => ({
            productId,
            quantity
        }));
        
        if (!clientId) {
            alert("Error: Client ID is missing.");
            return;
        }

        const newOrder: Order = {
            id: `o_${Date.now()}`,
            clientId: clientId,
            date: new Date().toISOString(),
            items: orderItems,
            createdByAdminId: loggedInUser?.id,
        };

        addOrder(newOrder);
        alert('Quote saved successfully!');
        navigate('/admin');
    };

    const totalSelectedItems = Object.keys(selectedItems).length;

    return (
        <div className="space-y-6 pb-24">
            <div>
                <Link to="/admin" className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 text-base">
                    <ChevronLeftIcon className="h-5 w-5 mr-1" />
                    Back to Dashboard
                </Link>
                <h1 className="text-4xl tracking-tight text-gray-900 dark:text-gray-100 section-heading">Create Stock Pick</h1>
                <p className="mt-2 text-lg text-gray-700 dark:text-gray-300">Select products and quantities to generate a client order.</p>
            </div>

            <div className="relative">
              <input
                  type="text"
                  placeholder="Search products by name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-gray-800/50 text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] transition text-base shadow-sm"
              />
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>

            <div className="space-y-4">
                {groupedAndFilteredProducts.map(({ brand, categories, uncategorized }) => (
                    <details key={brand.id} className="group bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden" open>
                        <summary className="flex items-center justify-between p-4 cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 flex items-center justify-center">
                                    <LocalMedia src={brand.logoUrl} alt={brand.name} type="image" className="max-h-full max-w-full object-contain" />
                                </div>
                                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 item-title">{brand.name}</h3>
                            </div>
                            <ChevronDownIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {categories.map(({ category, products }) => (
                                <details key={category.id} className="group/cat" open>
                                    <summary className="flex items-center justify-between p-3 pl-6 cursor-pointer list-none bg-gray-50 dark:bg-gray-900/30 hover:bg-gray-100 dark:hover:bg-gray-900/50">
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-300">{category.name}</h4>
                                         <ChevronDownIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 group-open/cat:rotate-180 transition-transform" />
                                    </summary>
                                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {products.map(product => (
                                            <ProductRow key={product.id} product={product} isSelected={!!selectedItems[product.id]} quantity={selectedItems[product.id]} onToggle={handleToggle} onQuantityChange={handleQuantityChange} />
                                        ))}
                                    </div>
                                </details>
                            ))}
                             {uncategorized.length > 0 && (
                                 <details className="group/cat" open>
                                    <summary className="flex items-center justify-between p-3 pl-6 cursor-pointer list-none bg-gray-50 dark:bg-gray-900/30 hover:bg-gray-100 dark:hover:bg-gray-900/50">
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-300">Other</h4>
                                        <ChevronDownIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 group-open/cat:rotate-180 transition-transform" />
                                    </summary>
                                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {uncategorized.map(product => (
                                             <ProductRow key={product.id} product={product} isSelected={!!selectedItems[product.id]} quantity={selectedItems[product.id]} onToggle={handleToggle} onQuantityChange={handleQuantityChange} />
                                        ))}
                                    </div>
                                </details>
                             )}
                        </div>
                    </details>
                ))}
            </div>

            {groupedAndFilteredProducts.length === 0 && (
                <div className="text-center py-16 bg-white dark:bg-gray-800/50 rounded-2xl">
                    <p className="text-gray-500 dark:text-gray-400">No products match your search.</p>
                </div>
            )}

            {totalSelectedItems > 0 && (
                 <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 z-30">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <p className="font-semibold text-gray-800 dark:text-gray-100">
                            {totalSelectedItems} item{totalSelectedItems > 1 ? 's' : ''} selected
                        </p>
                        <button onClick={handleSaveOrder} className="btn btn-primary">
                            <ClipboardDocumentListIcon className="h-5 w-5" />
                            <span>Save Quote</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockPick;