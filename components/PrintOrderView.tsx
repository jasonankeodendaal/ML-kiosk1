import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from './context/AppContext';
import LocalMedia from './LocalMedia';
import { PrinterIcon, ChevronLeftIcon } from './Icons';

const PrintOrderView: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const { orders, clients, products, brands, settings } = useAppContext();
    const navigate = useNavigate();

    const order = useMemo(() => orders.find(o => o.id === orderId), [orderId, orders]);
    const client = useMemo(() => clients.find(c => c.id === order?.clientId), [order, clients]);

    const orderDetails = useMemo(() => {
        if (!order) return [];
        return order.items.map(item => {
            const product = products.find(p => p.id === item.productId);
            const brand = brands.find(b => b.id === product?.brandId);
            return {
                ...item,
                product,
                brand,
            };
        }).filter(item => item.product);
    }, [order, products, brands]);
    
    if (!order || !client) {
        return (
            <div className="p-8 text-center">
                <p>Order not found.</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-blue-500">Go Back</button>
            </div>
        );
    }
    
    return (
        <div className="bg-gray-100 min-h-screen">
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `}</style>
             <div className="no-print p-4 bg-gray-800 text-white flex justify-between items-center">
                <div>
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-700">
                        <ChevronLeftIcon className="h-5 w-5" />
                        Back
                    </button>
                </div>
                <h1 className="text-lg font-bold">Print Preview</h1>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700">
                    <PrinterIcon className="h-5 w-5" />
                    Print
                </button>
            </div>
            <div className="max-w-4xl mx-auto bg-white p-12 shadow-lg">
                <header className="flex justify-between items-start pb-8 border-b">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Order List</h1>
                        <p className="text-gray-500">Date: {new Date(order.date).toLocaleDateString()}</p>
                    </div>
                    <div className="w-32">
                        <LocalMedia src={settings.logoUrl} alt="Company Logo" type="image" />
                    </div>
                </header>

                <section className="mt-8">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600 mb-2">Client Details</h2>
                    <div className="text-gray-800">
                        <p className="font-bold text-lg">{client.companyName}</p>
                        {client.address && <p>{client.address}</p>}
                        {client.email && <p>{client.email}</p>}
                        {client.tel && <p>{client.tel}</p>}
                    </div>
                </section>
                
                <section className="mt-10">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-700">Product</th>
                                <th className="p-3 text-sm font-semibold text-gray-700">SKU</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 text-right">Quantity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {orderDetails.map(item => (
                                <tr key={item.productId}>
                                    <td className="p-3">
                                        <p className="font-medium text-gray-900">{item.product?.name}</p>
                                        <p className="text-xs text-gray-500">{item.brand?.name}</p>
                                    </td>
                                    <td className="p-3 text-gray-600 font-mono text-sm">{item.product?.sku}</td>
                                    <td className="p-3 text-gray-800 font-semibold text-right">{item.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                <footer className="mt-12 pt-8 border-t text-center text-xs text-gray-400">
                    <p>Generated by Interactive Kiosk System</p>
                </footer>
            </div>
        </div>
    );
};

export default PrintOrderView;
