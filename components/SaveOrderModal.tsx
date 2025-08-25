import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from './context/AppContext';
import { XIcon, BuildingOfficeIcon, UserPlusIcon } from './Icons';
import type { Client } from '../types';

const MotionDiv = motion.div as any;

const ClientDetailsModal: React.FC = () => {
    const { 
        clientDetailsModalState, 
        closeClientDetailsModal,
        clients,
        addOrUpdateClient,
    } = useAppContext();

    const [isNewClient, setIsNewClient] = useState(true);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [clientDetails, setClientDetails] = useState<Partial<Client>>({ companyName: '', email: '', tel: '', address: '' });

    const { isOpen, onComplete } = clientDetailsModalState;

    const handleClose = () => {
        setIsNewClient(true);
        setSelectedClientId('');
        setClientDetails({ companyName: '', email: '', tel: '', address: '' });
        closeClientDetailsModal();
    };

    const handleConfirm = () => {
        let finalClientId: string;

        if (isNewClient) {
            if (!clientDetails.companyName) {
                alert('Company name is required for a new client.');
                return;
            }
            const newClient = addOrUpdateClient({
                id: `c_${Date.now()}`,
                ...clientDetails,
            } as Client);
            finalClientId = newClient.id;
        } else {
            if (!selectedClientId) {
                alert('Please select an existing client.');
                return;
            }
            finalClientId = selectedClientId;
        }
        
        onComplete(finalClientId);
        handleClose();
    };

    const handleClientFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setClientDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <MotionDiv
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={handleClose}
                >
                    <MotionDiv
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 section-heading">Select Client</h3>
                            <button onClick={handleClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"><XIcon className="h-5 w-5" /></button>
                        </header>

                        <div className="flex-grow p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setIsNewClient(false)} disabled={clients.length === 0} className={`flex-1 btn ${!isNewClient ? 'btn-primary' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}><BuildingOfficeIcon className="h-5 w-5"/> Existing Client</button>
                                <button onClick={() => setIsNewClient(true)} className={`flex-1 btn ${isNewClient ? 'btn-primary' : ''}`}><UserPlusIcon className="h-5 w-5"/> New Client</button>
                            </div>

                            {isNewClient ? (
                                <div className="space-y-3 pt-2">
                                    <input type="text" name="companyName" placeholder="Company Name*" value={clientDetails.companyName} onChange={handleClientFormChange} className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700" />
                                    <input type="email" name="email" placeholder="Email Address" value={clientDetails.email} onChange={handleClientFormChange} className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700" />
                                    <input type="tel" name="tel" placeholder="Telephone" value={clientDetails.tel} onChange={handleClientFormChange} className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700" />
                                    <textarea name="address" placeholder="Address" value={clientDetails.address} onChange={handleClientFormChange} rows={3} className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700" />
                                </div>
                            ) : (
                                <div className="pt-2">
                                    <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                                        <option value="">Select a client...</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        <footer className="bg-gray-50 dark:bg-gray-800/50 p-4 flex justify-end gap-3 rounded-b-2xl border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <button onClick={handleClose} type="button" className="btn bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600">Cancel</button>
                            <button onClick={handleConfirm} type="button" className="btn btn-primary">Continue</button>
                        </footer>
                    </MotionDiv>
                </MotionDiv>
            )}
        </AnimatePresence>
    );
};

export default ClientDetailsModal;
