import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from './context/AppContext.tsx';
import { ChevronLeftIcon, BuildingOfficeIcon, PencilIcon, PrinterIcon, PlusIcon } from './Icons';
import type { Client, Order } from '../types';

// A modal for editing client details
const ClientEditModal: React.FC<{ client: Client | null; onClose: () => void; onSave: (client: Client) => void }> = ({ client, onClose, onSave }) => {
    const [formData, setFormData] = useState<Client | null>(client);

    if (!client) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => prev ? { ...prev, [e.target.name]: e.target.value } : null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 section-heading">Edit Client Details</h3>
                        <div className="mt-4 grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium">Company Name</label>
                                <input type="text" name="companyName" value={formData?.companyName} onChange={handleChange} className="mt-1 w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Email</label>
                                <input type="email" name="email" value={formData?.email || ''} onChange={handleChange} className="mt-1 w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Telephone</label>
                                <input type="tel" name="tel" value={formData?.tel || ''} onChange={handleChange} className="mt-1 w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium">Address</label>
                                <textarea name="address" value={formData?.address || ''} onChange={handleChange} rows={3} className="mt-1 w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"></textarea>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-3 flex justify-end gap-3 rounded-b-2xl">
                        <button type="button" onClick={onClose} className="btn bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600">Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const ClientsView: React.FC = () => {
    const { clients, orders, updateClient, adminUsers } = useAppContext();
    const navigate = useNavigate();
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    const clientsWithOrders = useMemo(() => {
        return clients
            .map(client => ({
                ...client,
                orders: orders.filter(order => order.clientId === client.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            }))
            .sort((a,b) => a.companyName.localeCompare(b.companyName));
    }, [clients, orders]);

    const handleSaveClient = (updatedClient: Client) => {
        updateClient(updatedClient);
        setEditingClient(null);
    };

    return (
        <div className="space-y-6">
            {editingClient && <ClientEditModal client={editingClient} onClose={() => setEditingClient(null)} onSave={handleSaveClient} />}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl tracking-tight text-gray-900 dark:text-gray-100 section-heading">Client Quote Interests</h1>
                    <p className="mt-2 text-lg text-gray-700 dark:text-gray-300">View and manage saved quotes and expressions of interest for your clients.</p>
                </div>
                <Link to="/stock-pick" className="btn btn-primary">
                    <PlusIcon className="h-5 w-5" />
                    <span>Create New Quote</span>
                </Link>
            </div>

            {clientsWithOrders.length > 0 ? (
                <div className="space-y-4">
                    {clientsWithOrders.map(client => (
                        <details key={client.id} className="group bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <summary className="flex items-center justify-between p-4 cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <div className="flex items-center gap-4">
                                    <BuildingOfficeIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 item-title">{client.companyName}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{client.orders.length} quote{client.orders.length !== 1 && 's'}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={(e) => { e.preventDefault(); setEditingClient(client); }} className="btn bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 !py-1.5 !px-3">
                                    <PencilIcon className="h-4 w-4" /> <span className="hidden sm:inline ml-2">Edit</span>
                                </button>
                            </summary>
                            <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                                {client.orders.map(order => {
                                    const adminUser = adminUsers.find(u => u.id === order.createdByAdminId);
                                    return (
                                     <div key={order.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">Quote from {new Date(order.date).toLocaleDateString()}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {order.items.length} item{order.items.length !== 1 && 's'}
                                                {adminUser && <span className="text-gray-400 dark:text-gray-500"> • By {adminUser.firstName}</span>}
                                            </p>
                                        </div>
                                        <button onClick={() => navigate(`/order/print/${order.id}`)} className="btn btn-primary !py-1.5 !px-3">
                                            <PrinterIcon className="h-4 w-4" />
                                            <span className="hidden sm:inline ml-2">View & Print</span>
                                        </button>
                                    </div>
                                    )
                                })}
                                {client.orders.length === 0 && <p className="p-4 text-sm text-center text-gray-500 dark:text-gray-400">No quotes found for this client.</p>}
                            </div>
                        </details>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-100 dark:bg-gray-800/50 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 section-heading mt-4">No Client Quotes Found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Create your first quote to get started.</p>
                </div>
            )}
        </div>
    );
};

export default ClientsView;