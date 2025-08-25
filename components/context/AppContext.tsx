/// <reference path="../../swiper.d.ts" />

import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { 
    settings as initialSettings,
    brands as initialBrands,
    products as initialProducts,
    catalogues as initialCatalogues,
    pamphlets as initialPamphlets,
    screensaverAds as initialScreensaverAds,
    adminUsers as initialAdminUsers,
    tvContent as initialTvContent,
    categories as initialCategories,
    clients as initialClients,
    orders as initialOrders,
    kioskUsers as initialKioskUsers,
} from '../../data/mockData.ts';
import type { Settings, Brand, Product, Catalogue, Pamphlet, ScreensaverAd, BackupData, AdminUser, ThemeColors, StorageProvider, ProductDocument, TvContent, Category, Client, Order, OrderItem, KioskUser } from '../../types.ts';
import { idbGet, idbSet } from './idb.ts';
import { slugify } from '../utils.ts';

// --- PWA MANIFEST UTILITIES (placed outside component) ---
const resizeImage = (blob: Blob, size: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for resizing'));
    };
    img.src = url;
  });
};

const updatePwaManifest = async (logoUrl: string, getFileUrl: (src: string) => Promise<string>) => {
  try {
    const manifestLink = document.getElementById('manifest-link') as HTMLLinkElement;
    if (!manifestLink) return;

    // 1. Fetch original manifest
    const manifestResponse = await fetch('./manifest.json');
    const manifest = await manifestResponse.json();

    // 2. Fetch and process logo
    if (logoUrl) {
      const displayUrl = await getFileUrl(logoUrl);
      const imageResponse = await fetch(displayUrl);
      if (!imageResponse.ok) throw new Error(`Failed to fetch logo image at ${displayUrl}`);
      const imageBlob = await imageResponse.blob();

      const [icon192, icon512] = await Promise.all([
        resizeImage(imageBlob, 192),
        resizeImage(imageBlob, 512),
      ]);
      
      manifest.icons = [
        { src: icon192, type: 'image/png', sizes: '192x192', purpose: 'any maskable' },
        { src: icon512, type: 'image/png', sizes: '512x512', purpose: 'any maskable' },
      ];
    }

    // 3. Update manifest link
    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const newManifestUrl = URL.createObjectURL(manifestBlob);
    
    // Clean up old blob URL if it exists to prevent memory leaks
    if (manifestLink.href.startsWith('blob:')) {
      URL.revokeObjectURL(manifestLink.href);
    }
    
    manifestLink.href = newManifestUrl;
    console.log('PWA Manifest updated with new logo.');

  } catch (error) {
    console.error('Failed to update PWA manifest:', error);
  }
};


// --- GENERAL UTILITY FUNCTIONS ---
function deepMerge<T>(target: T, source: Partial<T>): T {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            const sourceKey = key as keyof T;
            if (isObject(source[sourceKey])) {
                if (!(sourceKey in target)) {
                    (output as any)[sourceKey] = source[sourceKey];
                } else {
                    (output[sourceKey] as any) = deepMerge(target[sourceKey], source[sourceKey] as any);
                }
            } else {
                (output as any)[sourceKey] = source[sourceKey];
            }
        });
    }
    return output;
}

function isObject(item: any): item is object {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

const loadFont = (fontName: string) => {
    if (!fontName) return;
    const fontId = `google-font-${fontName.replace(/\s+/g, '-')}`;
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@300;400;500;600;700;800;900&display=swap`;
      document.head.appendChild(link);
    }
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const verifyPermission = async (fileHandle: FileSystemDirectoryHandle, readWrite: boolean): Promise<boolean> => {
    const options: FileSystemHandlePermissionDescriptor = {};
    if (readWrite) {
      options.mode = 'readwrite';
    } else {
      options.mode = 'read';
    }
    try {
        if ((await fileHandle.queryPermission(options)) === 'granted') return true;
        if ((await fileHandle.requestPermission(options)) === 'granted') return true;
    } catch (error) {
        console.error("Error verifying file system permissions:", error);
    }
    return false;
};

// NEW HELPER for File System Access API
const getDirectoryHandleRecursive = async (rootHandle: FileSystemDirectoryHandle, path: string[]): Promise<FileSystemDirectoryHandle> => {
    let currentHandle = rootHandle;
    for (const segment of path) {
        if (!segment) continue; // Skip empty/invalid segments
        currentHandle = await currentHandle.getDirectoryHandle(segment, { create: true });
    }
    return currentHandle;
};


interface ConfirmationState {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
}

interface BookletModalState {
  isOpen: boolean;
  title: string;
  imageUrls: string[];
}

interface PdfModalState {
  isOpen:boolean;
  url: string;
  title: string;
}

interface ClientDetailsModalState {
  isOpen: boolean;
  onComplete: (clientId: string) => void;
}

type DocumentType = ProductDocument | Catalogue | Pamphlet;

type ViewCounts = {
    brands: Record<string, number>;
    products: Record<string, number>;
};

type SyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'error';

interface AppContextType {
  // Setup
  isSetupComplete: boolean;
  isAuthLoading: boolean;
  completeSetup: () => void;
  reInitiateSetup: () => void;

  // Data
  brands: Brand[];
  products: Product[];
  catalogues: Catalogue[];
  pamphlets: Pamphlet[];
  settings: Settings;
  screensaverAds: ScreensaverAd[];
  adminUsers: AdminUser[];
  loggedInUser: AdminUser | null;
  tvContent: TvContent[];
  categories: Category[];
  clients: Client[];
  orders: Order[];
  kioskUsers: KioskUser[];
  viewCounts: ViewCounts;
  
  // Auth
  login: (userId: string, pin: string) => AdminUser | null;
  logout: () => void;
  currentKioskUser: KioskUser | null;
  loginKioskUser: (userId: string, pin: string) => boolean;
  logoutKioskUser: () => void;


  // Updaters (CRUD)
  addBrand: (brand: Brand) => void;
  updateBrand: (brand: Brand) => void;
  deleteBrand: (brandId: string) => void; // Soft delete
  
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void; // Soft delete

  addCatalogue: (catalogue: Catalogue) => void;
  updateCatalogue: (catalogue: Catalogue) => void;
  deleteCatalogue: (catalogueId: string) => void;

  addPamphlet: (pamphlet: Pamphlet) => void;
  updatePamphlet: (pamphlet: Pamphlet) => void;
  deletePamphlet: (pamphletId: string) => void;

  addAd: (ad: ScreensaverAd) => void;
  updateAd: (ad: ScreensaverAd) => void;
  deleteAd: (adId: string) => void;

  addAdminUser: (user: AdminUser) => void;
  updateAdminUser: (user: AdminUser) => void;
  deleteAdminUser: (userId: string) => void;
  
  addTvContent: (content: TvContent) => void;
  updateTvContent: (content: TvContent) => void;
  deleteTvContent: (contentId: string) => void;

  addCategory: (category: Category) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (categoryId: string) => void;
  
  addKioskUser: (user: KioskUser) => void;
  updateKioskUser: (user: KioskUser) => void;
  deleteKioskUser: (userId: string) => void;


  updateSettings: (newSettings: Partial<Settings>) => void;
  restoreBackup: (data: Partial<BackupData>) => void;
  resetToDefaultData: () => void;
  
  // Client and Order CRUD
  addOrUpdateClient: (clientData: Partial<Client>) => Client;
  updateClient: (client: Client) => void;
  deleteClient: (clientId: string) => void;
  addOrder: (order: Order) => void;
  
  // Trash functions
  restoreBrand: (brandId: string) => void;
  permanentlyDeleteBrand: (brand: Brand) => void;
  restoreProduct: (productId: string) => void;
  permanentlyDeleteProduct: (product: Product) => void;
  restoreCatalogue: (catalogueId: string) => void;
  permanentlyDeleteCatalogue: (catalogue: Catalogue) => void;
  restorePamphlet: (pamphletId: string) => void;
  permanentlyDeletePamphlet: (pamphlet: Pamphlet) => void;
  restoreTvContent: (contentId: string) => void;
  permanentlyDeleteTvContent: (content: TvContent) => void;
  restoreKioskUser: (userId: string) => void;
  permanentlyDeleteKioskUser: (userId: string) => void;


  // Screensaver & Kiosk
  isScreensaverActive: boolean;
  isScreensaverEnabled: boolean;
  toggleScreensaver: () => void;
  exitScreensaver: () => void;
  localVolume: number;
  setLocalVolume: (volume: number) => void;
  activeTvContent: TvContent | null;
  playTvContent: (content: TvContent) => void;
  stopTvContent: () => void;
  setIsOnAdminPage: React.Dispatch<React.SetStateAction<boolean>>;


  // Global Modals
  pdfModalState: PdfModalState;
  bookletModalState: BookletModalState;
  clientDetailsModalState: ClientDetailsModalState;
  openDocument: (document: DocumentType, title: string) => void;
  closePdfModal: () => void;
  closeBookletModal: () => void;
  openClientDetailsModal: (onComplete: (clientId: string) => void) => void;
  closeClientDetailsModal: () => void;
  confirmation: ConfirmationState;
  showConfirmation: (message: string, onConfirm: () => void) => void;
  hideConfirmation: () => void;
  
  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // PWA Install Prompt
  deferredPrompt: BeforeInstallPromptEvent | null;
  triggerInstallPrompt: () => Promise<void>;

  // Storage and Sync
  storageProvider: StorageProvider;
  connectToLocalProvider: () => Promise<void>;
  connectToCloudProvider: (provider: 'customApi') => void;
  connectToSharedUrl: (url: string) => void;
  disconnectFromStorage: (silent?: boolean) => void;
  isStorageConnected: boolean;
  directoryHandle: FileSystemDirectoryHandle | null;
  saveFileToStorage: (file: File, directoryPath?: string[]) => Promise<string>;
  deleteFileFromStorage: (filePath: string) => Promise<void>;
  deleteDirectoryFromStorage: (directoryPath: string[]) => Promise<void>;
  getFileUrl: (fileName: string) => Promise<string>;
  saveDatabaseToLocal: (isAutoSave?: boolean) => Promise<boolean>;
  loadDatabaseFromLocal: (isAutoSync?: boolean) => Promise<boolean>;
  pushToCloud: (isAutoSave?: boolean) => Promise<boolean>;
  pullFromCloud: (isAutoSync?: boolean) => Promise<boolean>;
  syncStatus: SyncStatus;

  // Analytics
  trackBrandView: (brandId: string) => void;
  trackProductView: (productId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const usePersistentState = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = useState<T>(initialValue);
  const isInitialized = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const loadState = async () => {
      try {
        const storedValue = await idbGet<T>(key);
        if (isMounted) {
          if (storedValue !== undefined) {
            // Deep merge for settings object to handle new properties added in updates
            if (key === 'settings' && isObject(initialValue) && isObject(storedValue)) {
               setState(deepMerge(initialValue as any, storedValue as any));
            } else {
               setState(storedValue);
            }
          }
          isInitialized.current = true;
        }
      } catch (error) {
        console.error(`Failed to load state for key "${key}" from IndexedDB.`, error);
        if(isMounted) isInitialized.current = true;
      }
    };
    loadState();
    return () => { isMounted = false };
  }, [key, initialValue]);

  useEffect(() => {
    if (isInitialized.current) {
      idbSet(key, state).catch(error => {
        console.error(`Failed to save state for key "${key}" to IndexedDB.`, error);
      });
    }
  }, [key, state]);

  return [state, setState];
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isSetupComplete, setIsSetupComplete] = usePersistentState<boolean>('isSetupComplete', false);
    const [brands, setBrands] = usePersistentState<Brand[]>('brands', initialBrands);
    const [products, setProducts] = usePersistentState<Product[]>('products', initialProducts);
    const [catalogues, setCatalogues] = usePersistentState<Catalogue[]>('catalogues', initialCatalogues);
    const [pamphlets, setPamphlets] = usePersistentState<Pamphlet[]>('pamphlets', initialPamphlets);
    const [settings, setSettings] = usePersistentState<Settings>('settings', initialSettings);
    const [screensaverAds, setScreensaverAds] = usePersistentState<ScreensaverAd[]>('screensaverAds', initialScreensaverAds);
    const [adminUsers, setAdminUsers] = usePersistentState<AdminUser[]>('adminUsers', initialAdminUsers);
    const [tvContent, setTvContent] = usePersistentState<TvContent[]>('tvContent', initialTvContent);
    const [categories, setCategories] = usePersistentState<Category[]>('categories', initialCategories);
    const [clients, setClients] = usePersistentState<Client[]>('clients', initialClients);
    const [orders, setOrders] = usePersistentState<Order[]>('orders', initialOrders);
    const [kioskUsers, setKioskUsers] = usePersistentState<KioskUser[]>('kioskUsers', initialKioskUsers);
    const [viewCounts, setViewCounts] = usePersistentState<ViewCounts>('viewCounts', { brands: {}, products: {} });

    const [localVolume, setLocalVolume] = usePersistentState<number>('localVolume', 0.75);
    const [storageProvider, setStorageProvider] = usePersistentState<StorageProvider>('storageProvider', 'none');
    const [theme, setTheme] = usePersistentState<'light' | 'dark'>(
        'theme', 
        window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    );
    
    const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [loggedInUser, setLoggedInUser] = useState<AdminUser | null>(null);
  const [currentKioskUser, setCurrentKioskUser] = useState<KioskUser | null>(null);
  const [isScreensaverActive, setIsScreensaverActive] = useState(false);
  const [isScreensaverEnabled, setIsScreensaverEnabled] = useState(true);
  const [isOnAdminPage, setIsOnAdminPage] = useState(false);
  const inactivityTimer = useRef<number | null>(null);

  const [pdfModalState, setPdfModalState] = useState<PdfModalState>({ isOpen: false, url: '', title: '' });
  const [bookletModalState, setBookletModalState] = useState<BookletModalState>({ isOpen: false, title: '', imageUrls: [] });
  const [clientDetailsModalState, setClientDetailsModalState] = useState<ClientDetailsModalState>({ isOpen: false, onComplete: () => {} });
  const [activeTvContent, setActiveTvContent] = useState<TvContent | null>(null);

  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });
  
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  
  const blobUrlCache = useRef(new Map<string, string>());
  const fileHandleCache = useRef(new Map<string, FileSystemFileHandle>());
  const autoSaveTimer = useRef<number | null>(null);
  
  const completeSetup = useCallback(() => {
    setIsSetupComplete(true);
  }, [setIsSetupComplete]);

   const saveDatabaseToLocal = useCallback(async (isAutoSave = false): Promise<boolean> => {
        if (!directoryHandle) {
            if(!isAutoSave) alert("Not connected to a local folder.");
            return false;
        }
        try {
            await directoryHandle.getFileHandle('database.lock');
            if(!isAutoSave) alert("Error: A sync operation is already in progress. A 'database.lock' file was found. If this is an error, please remove the file manually from the shared folder and try again.");
            return false;
        } catch (e) {
            if (!(e instanceof DOMException && e.name === 'NotFoundError')) throw e;
        }

        let lockFileHandle;
        try {
            lockFileHandle = await directoryHandle.getFileHandle('database.lock', { create: true });
            const backupData: BackupData = { brands, products, catalogues, pamphlets, settings, screensaverAds, adminUsers, tvContent, categories, clients, orders, kioskUsers, viewCounts };
            const dataFileHandle = await directoryHandle.getFileHandle('database.json', { create: true });
            const writable = await dataFileHandle.createWritable();
            await writable.write(JSON.stringify(backupData, null, 2));
            await writable.close();
            return true;
        } catch (error) {
            console.error("Failed to save database to local folder:", error);
            if(!isAutoSave) alert(`Error saving data: ${error instanceof Error ? error.message : "Unknown error"}`);
            return false;
        } finally {
            if (lockFileHandle) {
                await directoryHandle.removeEntry('database.lock');
            }
        }
    }, [directoryHandle, brands, products, catalogues, pamphlets, settings, screensaverAds, adminUsers, tvContent, categories, clients, orders, kioskUsers, viewCounts]);
    
    const getCloudUrl = useCallback(() => {
        if (storageProvider === 'customApi') return settings.customApiUrl;
        if (storageProvider === 'sharedUrl') return settings.sharedUrl;
        return null;
    }, [storageProvider, settings]);

    const pushToCloud = useCallback(async (isAutoSave = false): Promise<boolean> => {
        const backupData: BackupData = { brands, products, catalogues, pamphlets, settings, screensaverAds, adminUsers, tvContent, categories, clients, orders, kioskUsers, viewCounts };
        const url = getCloudUrl();
        if (!url) {
            if(!isAutoSave) alert('Not connected to a cloud provider.');
            return false;
        }
        
        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (settings.customApiKey) headers['x-api-key'] = settings.customApiKey;
            const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(backupData) });
            if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
            return true;
        } catch (error) {
            if(!isAutoSave) alert(`Error pushing data to cloud: ${error instanceof Error ? error.message : "Unknown error"}`);
            return false;
        }
    }, [getCloudUrl, brands, products, catalogues, pamphlets, settings, screensaverAds, adminUsers, tvContent, categories, clients, orders, kioskUsers, viewCounts]);


    const performAutoSave = useCallback(async () => {
        setSyncStatus('syncing');
        let success = false;
        if (storageProvider === 'local') {
            success = await saveDatabaseToLocal(true);
        } else if (storageProvider === 'customApi' || storageProvider === 'sharedUrl') {
            success = await pushToCloud(true);
        }
        
        if (success) {
            setSyncStatus('synced');
        } else {
            setSyncStatus('error');
        }
    }, [storageProvider, saveDatabaseToLocal, pushToCloud]);
    
    const debouncedAutoSave = useCallback(() => {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = window.setTimeout(() => {
            performAutoSave();
        }, 2500);
    }, [performAutoSave]);

  const updateDataTimestamp = useCallback(() => {
    setSettings(prev => {
        const newState = { ...prev, lastUpdated: Date.now() };
        if (newState.sync?.autoSyncEnabled && storageProvider !== 'none') {
            setSyncStatus('pending');
            debouncedAutoSave();
        }
        return newState;
    });
  }, [storageProvider, debouncedAutoSave, setSettings, setSyncStatus]);

  const deleteFileFromStorage = useCallback(async (filePath: string): Promise<void> => {
    if (storageProvider !== 'local' || !directoryHandle || !filePath || filePath.startsWith('http') || filePath.startsWith('data:')) {
        return;
    }

    try {
        const hasPermission = await verifyPermission(directoryHandle, true);
        if (!hasPermission) {
            console.warn("Permission to delete file lost.");
            return;
        }

        const pathParts = filePath.split('/').filter(p => p);
        const fileName = pathParts.pop();
        if (!fileName) return;

        const dirHandle = await getDirectoryHandleRecursive(directoryHandle, pathParts);
        await dirHandle.removeEntry(fileName);

        fileHandleCache.current.delete(filePath);
        const cachedUrl = blobUrlCache.current.get(filePath);
        if (cachedUrl) {
            URL.revokeObjectURL(cachedUrl);
            blobUrlCache.current.delete(filePath);
        }
    } catch (error) {
        if (!(error instanceof DOMException && error.name === 'NotFoundError')) {
            console.error(`Error deleting file from storage: ${filePath}`, error);
        }
    }
  }, [storageProvider, directoryHandle]);

  const deleteDirectoryFromStorage = useCallback(async (directoryPath: string[]): Promise<void> => {
    if (storageProvider !== 'local' || !directoryHandle || directoryPath.length === 0) {
        return;
    }

    try {
        const hasPermission = await verifyPermission(directoryHandle, true);
        if (!hasPermission) {
            console.warn("Permission to delete directory lost.");
            return;
        }

        const sanitizedPath = directoryPath.map(segment => slugify(segment));
        const dirName = sanitizedPath.pop();
        if (!dirName) return;
        
        const parentHandle = await getDirectoryHandleRecursive(directoryHandle, sanitizedPath);
        await parentHandle.removeEntry(dirName, { recursive: true });
        
    } catch (error) {
        if (!(error instanceof DOMException && error.name === 'NotFoundError')) {
            console.error(`Error deleting directory: ${directoryPath.join('/')}`, error);
        }
    }
  }, [storageProvider, directoryHandle]);

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    const oldSettings = settings;
    
    setSettings(prev => {
      const mergedState = deepMerge(prev, newSettings);
      // This is basically an inline, combined version of the old updateSettings + updateDataTimestamp
      const newState = { ...mergedState, lastUpdated: Date.now() };
      
      if (newState.sync?.autoSyncEnabled && storageProvider !== 'none') {
          setSyncStatus('pending');
          debouncedAutoSave();
      }
      
      return newState;
    });

    if (newSettings.logoUrl && oldSettings.logoUrl !== newSettings.logoUrl) {
        deleteFileFromStorage(oldSettings.logoUrl);
    }
    if (newSettings.backgroundMusicUrl !== undefined && oldSettings.backgroundMusicUrl !== newSettings.backgroundMusicUrl) {
        if(oldSettings.backgroundMusicUrl) deleteFileFromStorage(oldSettings.backgroundMusicUrl);
    }
  }, [storageProvider, debouncedAutoSave, setSyncStatus, setSettings, settings, deleteFileFromStorage]);

  const restoreBackup = useCallback((data: Partial<BackupData>) => {
    // Note: The `|| initial...` is a fallback for corrupted/incomplete backup files.
    setBrands(Array.isArray(data.brands) ? data.brands : initialBrands);
    setProducts(Array.isArray(data.products) ? data.products : initialProducts);
    setCatalogues(Array.isArray(data.catalogues) ? data.catalogues : initialCatalogues);
    setPamphlets(Array.isArray(data.pamphlets) ? data.pamphlets : initialPamphlets);
    setScreensaverAds(Array.isArray(data.screensaverAds) ? data.screensaverAds : initialScreensaverAds);
    setAdminUsers(Array.isArray(data.adminUsers) ? data.adminUsers : initialAdminUsers);
    setTvContent(Array.isArray(data.tvContent) ? data.tvContent : initialTvContent);
    setCategories(Array.isArray(data.categories) ? data.categories : initialCategories);
    setClients(Array.isArray(data.clients) ? data.clients : initialClients);
    setOrders(Array.isArray(data.orders) ? data.orders : initialOrders);
    setKioskUsers(Array.isArray(data.kioskUsers) ? data.kioskUsers : initialKioskUsers);
    setViewCounts(data.viewCounts || { brands: {}, products: {} });
    
    // Cloud DBs might return settings as an array with one item, file backups as an object.
    // This handles both, preferring a direct object.
    const settingsSource = Array.isArray(data.settings) ? data.settings[0] : data.settings;
    if (settingsSource && isObject(settingsSource)) {
        setSettings(prev => deepMerge(prev, settingsSource as Partial<Settings>));
    } else {
        setSettings(initialSettings);
    }
  }, [setBrands, setProducts, setCatalogues, setPamphlets, setScreensaverAds, setAdminUsers, setSettings, setTvContent, setCategories, setClients, setOrders, setKioskUsers, setViewCounts]);

  const disconnectFromStorage = useCallback((silent = false) => {
    setStorageProvider('none');
    setDirectoryHandle(null);
    blobUrlCache.current.forEach(url => URL.revokeObjectURL(url));
    blobUrlCache.current.clear();
    fileHandleCache.current.clear();
    if (!silent) {
        alert("Disconnected from storage provider.");
    }
  }, [setStorageProvider, setDirectoryHandle]);
  
  const resetToDefaultData = useCallback(() => {
    setBrands(initialBrands);
    setProducts(initialProducts);
    setCatalogues(initialCatalogues);
    setPamphlets(initialPamphlets);
    setScreensaverAds(initialScreensaverAds);
    setAdminUsers(initialAdminUsers);
    setTvContent(initialTvContent);
    setCategories(initialCategories);
    setClients(initialClients);
    setOrders(initialOrders);
    setKioskUsers(initialKioskUsers);
    setViewCounts({ brands: {}, products: {} });
    setSettings({
        ...initialSettings,
        sync: {
            ...initialSettings.sync,
            autoSyncEnabled: false,
        }
    });
    disconnectFromStorage(true);
  }, [setBrands, setProducts, setCatalogues, setPamphlets, setScreensaverAds, setAdminUsers, setTvContent, setCategories, setClients, setOrders, setKioskUsers, setViewCounts, setSettings, disconnectFromStorage]);

  const logout = useCallback(() => {
      setLoggedInUser(null);
      sessionStorage.removeItem('kiosk-user');
  }, []);
  
  const logoutKioskUser = useCallback(() => {
      setCurrentKioskUser(null);
  }, []);

  const reInitiateSetup = useCallback(() => {
    if (currentKioskUser) logoutKioskUser();
    if (loggedInUser) logout();
    setIsSetupComplete(false);
  }, [setIsSetupComplete, currentKioskUser, loggedInUser, logout, logoutKioskUser]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  }, [setTheme]);
  
    useEffect(() => {
        const rootStyle = document.documentElement.style;
        const activeTheme: ThemeColors | undefined = theme === 'light' ? settings.lightTheme : settings.darkTheme;
        if (!activeTheme) return; 

        rootStyle.setProperty('--app-bg', activeTheme.appBg);
        rootStyle.setProperty('--app-bg-image', activeTheme.appBgImage);
        rootStyle.setProperty('--main-bg', activeTheme.mainBg);
        rootStyle.setProperty('--main-text', activeTheme.mainText);
        rootStyle.setProperty('--main-shadow', activeTheme.mainShadow);
        rootStyle.setProperty('--primary-color', activeTheme.primary);
        rootStyle.setProperty('--btn-primary-bg', activeTheme.primaryButton.background);
        rootStyle.setProperty('--btn-primary-text', activeTheme.primaryButton.text);
        rootStyle.setProperty('--btn-primary-hover-bg', activeTheme.primaryButton.hoverBackground);
        rootStyle.setProperty('--btn-destructive-bg', activeTheme.destructiveButton.background);
        rootStyle.setProperty('--btn-destructive-text', activeTheme.destructiveButton.text);
        rootStyle.setProperty('--btn-destructive-hover-bg', activeTheme.destructiveButton.hoverBackground);
        
        const { typography, header, footer, pamphletPlaceholder } = settings;
        if (!typography || !header || !footer || !pamphletPlaceholder) return; 
        
        const { body, headings, itemTitles } = typography;
        rootStyle.setProperty('--body-font-family', body.fontFamily);
        rootStyle.setProperty('--body-font-weight', body.fontWeight);
        rootStyle.setProperty('--body-font-style', body.fontStyle);
        rootStyle.setProperty('--body-font-decoration', body.textDecoration);
        rootStyle.setProperty('--headings-font-family', headings.fontFamily);
        rootStyle.setProperty('--headings-font-weight', headings.fontWeight);
        rootStyle.setProperty('--headings-font-style', headings.fontStyle);
        rootStyle.setProperty('--headings-font-decoration', headings.textDecoration);
        rootStyle.setProperty('--item-titles-font-family', itemTitles.fontFamily);
        rootStyle.setProperty('--item-titles-font-weight', itemTitles.fontWeight);
        rootStyle.setProperty('--item-titles-font-style', itemTitles.fontStyle);
        rootStyle.setProperty('--item-titles-font-decoration', itemTitles.textDecoration);
        
        const fontsToLoad = new Set([
            body.fontFamily, headings.fontFamily, itemTitles.fontFamily,
            header.typography.fontFamily, footer.typography.fontFamily,
            pamphletPlaceholder.font.fontFamily,
        ]);
        fontsToLoad.forEach(font => font && loadFont(font));
    }, [settings, theme]);

  const toggleScreensaver = () => setIsScreensaverEnabled(prev => !prev);
  const exitScreensaver = useCallback(() => setIsScreensaverActive(false), []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (isOnAdminPage) {
        return;
    }
    if (isScreensaverEnabled && settings.screensaverDelay > 0 && !activeTvContent) {
      inactivityTimer.current = window.setTimeout(() => {
        if(document.visibilityState === 'visible') setIsScreensaverActive(true);
      }, settings.screensaverDelay * 1000);
    }
  }, [settings.screensaverDelay, isScreensaverEnabled, activeTvContent, isOnAdminPage]);

  const handleUserActivity = useCallback(() => {
    if (isScreensaverActive) exitScreensaver();
    resetInactivityTimer();
  }, [isScreensaverActive, resetInactivityTimer, exitScreensaver]);
  
  useEffect(() => {
    resetInactivityTimer();
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleUserActivity));
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
    };
  }, [handleUserActivity, resetInactivityTimer, isScreensaverEnabled]);

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('kiosk-user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (adminUsers.find(u => u.id === user.id)) {
            setLoggedInUser(user);
        } else {
            sessionStorage.removeItem('kiosk-user');
        }
      }
    } catch (e) {
      console.error("Failed to parse user from session storage", e);
      sessionStorage.removeItem('kiosk-user');
    }
    setIsAuthLoading(false);
  }, [adminUsers]);

  const login = useCallback((userId: string, pin: string): AdminUser | null => {
    const user = adminUsers.find(u => u.id === userId && u.pin === pin);
    if (user) {
        setLoggedInUser(user);
        sessionStorage.setItem('kiosk-user', JSON.stringify(user));
        return user;
    }
    return null;
  }, [adminUsers]);

  const loginKioskUser = useCallback((userId: string, pin: string): boolean => {
    const user = kioskUsers.find(u => u.id === userId && u.pin === pin && !u.isDeleted);
    if (user) {
        setCurrentKioskUser(user);
        return true;
    }
    return false;
  }, [kioskUsers]);
  
  const addBrand = useCallback((b: Brand) => { setBrands(p => [...p, b]); updateDataTimestamp(); }, [setBrands, updateDataTimestamp]);
  const updateBrand = useCallback((b: Brand) => { setBrands(p => p.map(i => i.id === b.id ? b : i)); updateDataTimestamp(); }, [setBrands, updateDataTimestamp]);
  const deleteBrand = useCallback((brandId: string) => { setBrands(prev => prev.map(b => b.id === brandId ? { ...b, isDeleted: true } : b)); updateDataTimestamp(); }, [setBrands, updateDataTimestamp]);
  
  const addProduct = useCallback((p: Product) => { setProducts(prev => [...prev, p]); updateDataTimestamp(); }, [setProducts, updateDataTimestamp]);
  const updateProduct = useCallback((p: Product) => { setProducts(prev => prev.map(i => i.id === p.id ? p : i)); updateDataTimestamp(); }, [setProducts, updateDataTimestamp]);
  const deleteProduct = useCallback((productId: string) => { setProducts(prev => prev.map(p => p.id === productId ? { ...p, isDeleted: true } : p)); updateDataTimestamp(); }, [setProducts, updateDataTimestamp]);

  const restoreBrand = useCallback((brandId: string) => {
    setBrands(prev => prev.map(b => b.id === brandId ? { ...b, isDeleted: false } : b));
    setProducts(prev => prev.map(p => p.brandId === brandId ? { ...p, isDeleted: false } : p));
    updateDataTimestamp();
  }, [setBrands, setProducts, updateDataTimestamp]);

  const permanentlyDeleteBrand = useCallback((brand: Brand) => {
    const productsToDelete = products.filter(p => p.brandId === brand.id);
    productsToDelete.forEach(product => {
        const brandSlug = slugify(brand.name);
        const productSlug = slugify(product.name);
        deleteDirectoryFromStorage(['products', brandSlug, `${productSlug}-${product.id}`]);
    });
    deleteDirectoryFromStorage(['brands', `${slugify(brand.name)}-${brand.id}`]);
    
    setBrands(p => p.filter(i => i.id !== brand.id));
    setProducts(p => p.filter(prod => prod.brandId !== brand.id));
    setCatalogues(p => p.filter(c => c.brandId !== brand.id));
    setCategories(p => p.filter(c => c.brandId !== brand.id));
    updateDataTimestamp();
  }, [setBrands, setProducts, setCatalogues, setCategories, products, updateDataTimestamp, deleteDirectoryFromStorage]);
  
  const restoreProduct = useCallback((productId: string) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, isDeleted: false } : p));
    updateDataTimestamp();
  }, [setProducts, updateDataTimestamp]);

  const permanentlyDeleteProduct = useCallback((product: Product) => {
    const brand = brands.find(b => b.id === product.brandId);
    if (brand) {
      const brandSlug = slugify(brand.name);
      const productSlug = slugify(product.name);
      deleteDirectoryFromStorage(['products', brandSlug, `${productSlug}-${product.id}`]);
    }
    setProducts(p => p.filter(i => i.id !== product.id));
    updateDataTimestamp();
  }, [setProducts, brands, updateDataTimestamp, deleteDirectoryFromStorage]);

  const addCatalogue = useCallback((c: Catalogue) => { setCatalogues(p => [...p, c]); updateDataTimestamp(); }, [setCatalogues, updateDataTimestamp]);
  const updateCatalogue = useCallback((c: Catalogue) => { setCatalogues(p => p.map(i => i.id === c.id ? c : i)); updateDataTimestamp(); }, [setCatalogues, updateDataTimestamp]);
  const deleteCatalogue = useCallback((id: string) => { setCatalogues(p => p.map(i => i.id === id ? { ...i, isDeleted: true } : i)); updateDataTimestamp(); }, [setCatalogues, updateDataTimestamp]);
  
  const addPamphlet = useCallback((p: Pamphlet) => { setPamphlets(prev => [...prev, p]); updateDataTimestamp(); }, [setPamphlets, updateDataTimestamp]);
  const updatePamphlet = useCallback((p: Pamphlet) => { setPamphlets(prev => prev.map(i => i.id === p.id ? p : i)); updateDataTimestamp(); }, [setPamphlets, updateDataTimestamp]);
  const deletePamphlet = useCallback((id: string) => { setPamphlets(p => p.map(i => i.id === id ? { ...i, isDeleted: true } : i)); updateDataTimestamp(); }, [setPamphlets, updateDataTimestamp]);
  
  const addAd = useCallback((a: ScreensaverAd) => { setScreensaverAds(p => [...p, a]); updateDataTimestamp(); }, [setScreensaverAds, updateDataTimestamp]);
  const updateAd = useCallback((a: ScreensaverAd) => { setScreensaverAds(p => p.map(i => i.id === a.id ? a : i)); updateDataTimestamp(); }, [setScreensaverAds, updateDataTimestamp]);
  const deleteAd = useCallback((adId: string) => { 
    const adToDelete = screensaverAds.find(ad => ad.id === adId);
    if(adToDelete) {
        deleteDirectoryFromStorage(['screensaver', `${slugify(adToDelete.title)}-${adToDelete.id}`]);
    }
    setScreensaverAds(p => p.filter(i => i.id !== adId)); 
    updateDataTimestamp(); 
  }, [setScreensaverAds, screensaverAds, updateDataTimestamp, deleteDirectoryFromStorage]);
  
  const addAdminUser = useCallback((u: AdminUser) => {
      setAdminUsers(p => [...p, u]);
      updateDataTimestamp();
  }, [setAdminUsers, updateDataTimestamp]);

  const updateAdminUser = useCallback((u: AdminUser) => {
      setAdminUsers(p => p.map(i => i.id === u.id ? u : i));
      if (loggedInUser?.id === u.id) {
          setLoggedInUser(u);
          sessionStorage.setItem('kiosk-user', JSON.stringify(u));
      }
      updateDataTimestamp();
  }, [setAdminUsers, updateDataTimestamp, loggedInUser]);
  
  const deleteAdminUser = useCallback((id: string) => { if (loggedInUser?.id === id) { alert("Cannot delete self."); return; } setAdminUsers(p => p.filter(i => i.id !== id)); updateDataTimestamp(); }, [loggedInUser, setAdminUsers, updateDataTimestamp]);
  
  const addTvContent = useCallback((c: TvContent) => { setTvContent(p => [...p, c]); updateDataTimestamp(); }, [setTvContent, updateDataTimestamp]);
  const updateTvContent = useCallback((c: TvContent) => { setTvContent(p => p.map(i => i.id === c.id ? c : i)); updateDataTimestamp(); }, [setTvContent, updateDataTimestamp]);
  const deleteTvContent = useCallback((id: string) => { setTvContent(p => p.map(i => i.id === id ? { ...i, isDeleted: true } : i)); updateDataTimestamp(); }, [setTvContent, updateDataTimestamp]);

  const addCategory = useCallback((c: Category) => { setCategories(p => [...p, c]); updateDataTimestamp(); }, [setCategories, updateDataTimestamp]);
  const updateCategory = useCallback((c: Category) => { setCategories(p => p.map(i => i.id === c.id ? c : i)); updateDataTimestamp(); }, [setCategories, updateDataTimestamp]);
  const deleteCategory = useCallback((id: string) => { setCategories(p => p.map(i => i.id === id ? { ...i, isDeleted: true } : i)); updateDataTimestamp(); }, [setCategories, updateDataTimestamp]);
  
  const addKioskUser = useCallback((u: KioskUser) => { setKioskUsers(p => [...p, u]); updateDataTimestamp(); }, [setKioskUsers, updateDataTimestamp]);
  const updateKioskUser = useCallback((u: KioskUser) => { setKioskUsers(p => p.map(i => i.id === u.id ? u : i)); updateDataTimestamp(); }, [setKioskUsers, updateDataTimestamp]);
  const deleteKioskUser = useCallback((id: string) => { setKioskUsers(p => p.map(i => i.id === id ? { ...i, isDeleted: true } : i)); updateDataTimestamp(); }, [setKioskUsers, updateDataTimestamp]);


  const restoreCatalogue = useCallback((id: string) => {
    setCatalogues(prev => prev.map(c => c.id === id ? { ...c, isDeleted: false } : c));
    updateDataTimestamp();
  }, [setCatalogues, updateDataTimestamp]);

  const permanentlyDeleteCatalogue = useCallback((catalogue: Catalogue) => {
    const brand = brands.find(b => b.id === catalogue.brandId);
    const brandSlug = brand ? slugify(brand.name) : 'unbranded';
    const catalogueSlug = slugify(catalogue.title);
    deleteDirectoryFromStorage(['catalogues', catalogue.year.toString(), brandSlug, `${catalogueSlug}-${catalogue.id}`]);
    setCatalogues(p => p.filter(i => i.id !== catalogue.id));
    updateDataTimestamp();
  }, [setCatalogues, brands, updateDataTimestamp, deleteDirectoryFromStorage]);

  const restorePamphlet = useCallback((id: string) => {
    setPamphlets(prev => prev.map(p => p.id === id ? { ...p, isDeleted: false } : p));
    updateDataTimestamp();
  }, [setPamphlets, updateDataTimestamp]);

  const permanentlyDeletePamphlet = useCallback((pamphlet: Pamphlet) => {
    if (pamphlet.startDate) {
        const startDate = new Date(pamphlet.startDate);
        const year = startDate.getFullYear().toString();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const pamphletSlug = slugify(pamphlet.title);
        deleteDirectoryFromStorage(['pamphlets', year, month, `${pamphletSlug}-${pamphlet.id}`]);
    }
    setPamphlets(p => p.filter(i => i.id !== pamphlet.id));
    updateDataTimestamp();
  }, [setPamphlets, updateDataTimestamp, deleteDirectoryFromStorage]);

  const restoreTvContent = useCallback((id: string) => {
    setTvContent(prev => prev.map(tc => tc.id === id ? { ...tc, isDeleted: false } : tc));
    updateDataTimestamp();
  }, [setTvContent, updateDataTimestamp]);

  const permanentlyDeleteTvContent = useCallback((content: TvContent) => {
    const brand = brands.find(b => b.id === content.brandId);
    if (brand) {
        const brandSlug = slugify(brand.name);
        const modelSlug = slugify(content.modelName);
        deleteDirectoryFromStorage(['tv-content', brandSlug, `${modelSlug}-${content.id}`]);
    }
    setTvContent(p => p.filter(i => i.id !== content.id));
    updateDataTimestamp();
  }, [setTvContent, brands, updateDataTimestamp, deleteDirectoryFromStorage]);
  
  const restoreKioskUser = useCallback((id: string) => { setKioskUsers(p => p.map(i => i.id === id ? { ...i, isDeleted: false } : i)); updateDataTimestamp(); }, [setKioskUsers, updateDataTimestamp]);
  const permanentlyDeleteKioskUser = useCallback((id: string) => { setKioskUsers(p => p.filter(i => i.id !== id)); updateDataTimestamp(); }, [setKioskUsers, updateDataTimestamp]);

  const addOrUpdateClient = useCallback((clientData: Partial<Client>): Client => {
      let clientToReturn: Client;
      setClients(prev => {
        const existingIndex = clientData.id ? prev.findIndex(c => c.id === clientData.id) : -1;
        if (existingIndex > -1) {
          const updatedClients = [...prev];
          updatedClients[existingIndex] = { ...updatedClients[existingIndex], ...clientData } as Client;
          clientToReturn = updatedClients[existingIndex];
          return updatedClients;
        } else {
          const newClient: Client = {
            id: `c_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            companyName: '',
            ...clientData
          } as Client;
          clientToReturn = newClient;
          return [...prev, newClient];
        }
      });
      updateDataTimestamp();
      // @ts-ignore
      return clientToReturn;
    }, [setClients, updateDataTimestamp]);

  const updateClient = useCallback((client: Client) => {
    setClients(prev => prev.map(c => c.id === client.id ? client : c));
    updateDataTimestamp();
  }, [setClients, updateDataTimestamp]);

  const deleteClient = useCallback((clientId: string) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, isDeleted: true } : c));
    updateDataTimestamp();
  }, [setClients, updateDataTimestamp]);
  
  const addOrder = useCallback((order: Order) => {
    setOrders(prev => [...prev, order]);
    updateDataTimestamp();
  }, [setOrders, updateDataTimestamp]);

  const openClientDetailsModal = useCallback((onComplete: (clientId: string) => void) => {
    setIsScreensaverActive(false);
    setClientDetailsModalState({ isOpen: true, onComplete });
  }, []);

  const closeClientDetailsModal = useCallback(() => {
    setClientDetailsModalState({ isOpen: false, onComplete: () => {} });
  }, []);

  const playTvContent = useCallback((content: TvContent) => {
    setIsScreensaverActive(false);
    setActiveTvContent(content);
  }, []);

  const stopTvContent = useCallback(() => {
    setActiveTvContent(null);
    resetInactivityTimer();
  }, [resetInactivityTimer]);
  
  const getFileUrl = useCallback(async (src: string): Promise<string> => {
    if (!src) return '';
    if (src.startsWith('http') || src.startsWith('data:')) return src;

    if (blobUrlCache.current.has(src)) {
        const cachedUrl = blobUrlCache.current.get(src)!;
        try {
            const response = await fetch(cachedUrl, { method: 'HEAD' });
            if (response.ok) return cachedUrl;
        } catch (e) {}
        URL.revokeObjectURL(cachedUrl);
        blobUrlCache.current.delete(src);
    }
    
    if (storageProvider === 'local' && directoryHandle) {
        try {
            let handle = fileHandleCache.current.get(src);
            if (!handle) {
                if (!(await verifyPermission(directoryHandle, false))) {
                    disconnectFromStorage();
                    alert("Permission lost. Please reconnect storage.");
                    return '';
                }
                
                const pathParts = src.split('/').filter(p => p);
                const fileName = pathParts.pop();
                if (!fileName) throw new Error(`Invalid file path: ${src}`);

                const dirHandle = await getDirectoryHandleRecursive(directoryHandle, pathParts);
                handle = await dirHandle.getFileHandle(fileName);
                fileHandleCache.current.set(src, handle);
            }
            const file = await handle.getFile();
            const newBlobUrl = URL.createObjectURL(file);
            blobUrlCache.current.set(src, newBlobUrl);
            return newBlobUrl;
        } catch (error) {
            console.error(`Error getting local file handle for "${src}":`, error);
            return '';
        }
    }
    
    return '';
  }, [storageProvider, directoryHandle, disconnectFromStorage]);

  const openDocument = useCallback(async (document: DocumentType, title: string) => {
    setIsScreensaverActive(false);
    
    switch(document.type) {
        case 'pdf': {
            let displayUrl = '';
            if (document.url.startsWith('data:application/pdf')) {
                displayUrl = document.url;
            } else {
                displayUrl = await getFileUrl(document.url);
            }
            
            if (displayUrl) {
                setPdfModalState({ isOpen: true, url: displayUrl, title });
            } else {
                alert("Could not load the PDF document.");
            }
            break;
        }
        case 'image':
            if (document.imageUrls && document.imageUrls.length > 0) {
                setBookletModalState({ isOpen: true, title, imageUrls: document.imageUrls });
            } else {
                alert("This document has no images to display.");
            }
            break;
    }
  }, [getFileUrl]);

  const closePdfModal = useCallback(() => {
    if (pdfModalState.url.startsWith('blob:')) {
        URL.revokeObjectURL(pdfModalState.url);
    }
    setPdfModalState({ isOpen: false, url: '', title: '' });
  }, [pdfModalState.url]);

  const closeBookletModal = useCallback(() => setBookletModalState({ isOpen: false, title: '', imageUrls: [] }), []);

  const showConfirmation = useCallback((message: string, onConfirm: () => void) => {
    setConfirmation({ isOpen: true, message, onConfirm });
  }, []);

  const hideConfirmation = useCallback(() => {
    setConfirmation(prev => ({ ...prev, isOpen: false }));
  }, []);

  const connectToLocalProvider = useCallback(async () => {
    if (!window.showDirectoryPicker) {
        alert("Your browser does not support the File System Access API. Please use a modern browser like Chrome or Edge on a desktop computer.");
        return;
    }
    const isSuperAdmin = loggedInUser?.isMainAdmin ?? false;
    const mode: 'read' | 'readwrite' = isSuperAdmin ? 'readwrite' : 'read';
    const writePermissionRequired = mode === 'readwrite';
    
    try {
        const handle = await window.showDirectoryPicker({ mode });
        if (await verifyPermission(handle, writePermissionRequired)) {
            disconnectFromStorage(true); // Clear all old caches before connecting
            setDirectoryHandle(handle);
            setStorageProvider('local');
            alert(`Connected to local folder "${handle.name}" in ${mode} mode. You can now sync data from the Backup/Restore tab.`);
        } else {
            alert("Permission to the folder was denied.");
        }
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error("Error connecting to local folder:", error);
        alert(`Failed to connect to local folder. ${error instanceof Error ? error.message : ''}`);
    }
  }, [setStorageProvider, setDirectoryHandle, disconnectFromStorage, loggedInUser]);
  
  const connectToCloudProvider = useCallback((provider: 'customApi') => {
    const url = settings.customApiUrl;
    if (!url) {
        alert(`Please set the Custom API URL in the Settings > API Integrations tab first.`);
        return;
    }
    disconnectFromStorage(true);
    setStorageProvider(provider);
    alert(`Connected to Custom API. You can now sync data from the Cloud Sync tab.`);
  }, [settings.customApiUrl, setStorageProvider, disconnectFromStorage]);
  
  const connectToSharedUrl = useCallback((url: string) => {
    if (!url) {
        alert(`Please provide a valid URL.`);
        return;
    }
    
    disconnectFromStorage(true);
    updateSettings({ sharedUrl: url });
    setStorageProvider('sharedUrl');
    alert(`Connected to Shared URL. You can now sync data from the Cloud Sync tab.`);
  }, [setStorageProvider, disconnectFromStorage, updateSettings]);


  useEffect(() => {
    if (directoryHandle) {
        const checkPerms = async () => {
            const hasWritePermission = await verifyPermission(directoryHandle, true);
            const hasReadPermission = await verifyPermission(directoryHandle, false);
            if (!hasReadPermission && !hasWritePermission) {
                console.warn("Permission for persisted directory handle was lost. Automatically disconnecting.");
                disconnectFromStorage();
                alert("Connection to the local folder was lost as permission was not granted. Please reconnect via the Storage tab.");
            }
        };
        checkPerms();
    }
  }, [directoryHandle, disconnectFromStorage]);
  
  const saveFileToStorage = useCallback(async (file: File, directoryPath: string[] = []): Promise<string> => {
    if (storageProvider === 'local' && directoryHandle) {
        const hasPermission = await verifyPermission(directoryHandle, true);
        if (!hasPermission) {
            disconnectFromStorage();
            throw new Error("Permission to write to the folder was lost. Disconnected from storage.");
        }
        
        const targetDirectoryHandle = await getDirectoryHandleRecursive(directoryHandle, directoryPath);

        const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
        const fileHandle = await targetDirectoryHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(file);
        await writable.close();
        
        return [...directoryPath, fileName].join('/');
    }

    return fileToBase64(file);
  }, [storageProvider, directoryHandle, disconnectFromStorage]);
  
  const isStorageConnected = storageProvider !== 'none';
  
  const loadDatabaseFromLocal = useCallback(async (isAutoSync = false): Promise<boolean> => {
    if (!directoryHandle) {
        if (!isAutoSync) alert("Not connected to a local folder.");
        return false;
    }
    try {
        const fileHandle = await directoryHandle.getFileHandle('database.json');
        const file = await fileHandle.getFile();
        const text = await file.text();
        const data = JSON.parse(text);

        const remoteSettings = Array.isArray(data.settings) ? data.settings[0] : data.settings;
        if (isAutoSync && remoteSettings?.lastUpdated && settings.lastUpdated && remoteSettings.lastUpdated <= settings.lastUpdated) {
             console.log('Background sync (Local): No new data found.');
             return true; // Still a success, just no change
        }

        restoreBackup(data);
        if (!isAutoSync) {
            alert("Data successfully loaded from the connected folder.");
        }
        return true;
    } catch (error) {
        if (isAutoSync) {
            console.error('Background sync (Local) failed:', error);
        } else {
            console.error("Failed to load database from local folder:", error);
            alert(`Error loading data: ${error instanceof Error ? error.message : "database.json not found or is invalid."}`);
        }
        return false;
    }
  }, [directoryHandle, restoreBackup, settings]);
  
  const pullFromCloud = useCallback(async (isAutoSync = false): Promise<boolean> => {
    const url = getCloudUrl();
    if (!url) {
        if (!isAutoSync) alert("Not connected to a cloud provider.");
        return false;
    }
      try {
          const headers: HeadersInit = {};
          if (settings.customApiKey) headers['x-api-key'] = settings.customApiKey;
          const response = await fetch(url, { headers, cache: 'no-store' });
          if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
          
          const data = await response.json();
          const remoteSettings = Array.isArray(data.settings) ? data.settings[0] : data.settings;
          if (isAutoSync && remoteSettings?.lastUpdated && settings.lastUpdated && remoteSettings.lastUpdated <= settings.lastUpdated) {
               console.log('Background sync (Cloud): No new data found.');
               return true;
          }
          
          restoreBackup(data);
          if (!isAutoSync) {
            alert("Data successfully pulled from the cloud.");
          }
          return true;
      } catch (error) {
          if (isAutoSync) {
            console.error('Background sync (Cloud) failed:', error);
          } else {
            alert(`Error pulling data from cloud: ${error instanceof Error ? error.message : "Unknown error"}`);
          }
          return false;
      }
  }, [getCloudUrl, restoreBackup, settings]);

  // Live Sync Polling for Local/Network Drive
  useEffect(() => {
    if (storageProvider !== 'local' || !settings.sync?.autoSyncEnabled) return;

    const LIVE_SYNC_INTERVAL_MS = 3000; // 3 seconds
    
    console.log('Starting live sync polling for local/network drive.');
    const intervalId = setInterval(() => {
        loadDatabaseFromLocal(true);
    }, LIVE_SYNC_INTERVAL_MS);

    loadDatabaseFromLocal(true); // Initial check

    return () => {
        console.log('Clearing live sync interval for local/network drive.');
        clearInterval(intervalId);
    };
  }, [storageProvider, directoryHandle, loadDatabaseFromLocal, settings.sync?.autoSyncEnabled]);

  // Live Sync Polling for Cloud Providers
  useEffect(() => {
    if ((storageProvider !== 'customApi' && storageProvider !== 'sharedUrl') || !settings.sync?.autoSyncEnabled) return;
    
    const LIVE_SYNC_INTERVAL_MS = 3000; // 3 seconds

    console.log('Starting live sync polling for cloud provider.');
    const intervalId = setInterval(() => {
        pullFromCloud(true);
    }, LIVE_SYNC_INTERVAL_MS);

    pullFromCloud(true); // Initial check

    return () => {
        console.log('Clearing live sync interval for cloud provider.');
        clearInterval(intervalId);
    };
  }, [storageProvider, pullFromCloud, settings.sync?.autoSyncEnabled]);

  // Immediate sync on tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && storageProvider !== 'none' && settings.sync?.autoSyncEnabled) {
        console.log('Tab became visible, triggering immediate sync.');
        if (storageProvider === 'local') {
          loadDatabaseFromLocal(true);
        } else if (storageProvider === 'customApi' || storageProvider === 'sharedUrl') {
          pullFromCloud(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [storageProvider, settings.sync?.autoSyncEnabled, loadDatabaseFromLocal, pullFromCloud]);

  // PWA Install prompt
  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);
  
  // Dynamic PWA Manifest updater
  const lastUpdatedLogoUrl = useRef<string | null>(null);
  useEffect(() => {
    if (settings.logoUrl && settings.logoUrl !== lastUpdatedLogoUrl.current) {
        updatePwaManifest(settings.logoUrl, getFileUrl);
        lastUpdatedLogoUrl.current = settings.logoUrl;
    }
  }, [settings.logoUrl, getFileUrl]);

  const triggerInstallPrompt = useCallback(async () => {
    if (!deferredPrompt) {
      alert('The app cannot be installed right now. Please try again later.');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const trackBrandView = useCallback((brandId: string) => {
    setViewCounts(prev => ({
        ...prev,
        brands: {
            ...prev.brands,
            [brandId]: (prev.brands[brandId] || 0) + 1,
        }
    }));
  }, [setViewCounts]);

  const trackProductView = useCallback((productId: string) => {
    setViewCounts(prev => ({
        ...prev,
        products: {
            ...prev.products,
            [productId]: (prev.products[productId] || 0) + 1,
        }
    }));
  }, [setViewCounts]);

  return (
    <AppContext.Provider value={{
        isSetupComplete, completeSetup, reInitiateSetup, isAuthLoading,
        brands, products, catalogues, pamphlets, settings, screensaverAds, adminUsers, loggedInUser, tvContent, categories, clients, orders, kioskUsers, viewCounts,
        login, logout, currentKioskUser, loginKioskUser, logoutKioskUser,
        addBrand, updateBrand, deleteBrand,
        addProduct, updateProduct, deleteProduct,
        addCatalogue, updateCatalogue, deleteCatalogue,
        addPamphlet, updatePamphlet, deletePamphlet,
        addAd, updateAd, deleteAd,
        addAdminUser, updateAdminUser, deleteAdminUser,
        addTvContent, updateTvContent, deleteTvContent,
        addCategory, updateCategory, deleteCategory,
        addKioskUser, updateKioskUser, deleteKioskUser,
        updateSettings, restoreBackup, resetToDefaultData,
        addOrUpdateClient, updateClient, deleteClient, addOrder,
        restoreBrand, permanentlyDeleteBrand, restoreProduct, permanentlyDeleteProduct,
        restoreCatalogue, permanentlyDeleteCatalogue, restorePamphlet, permanentlyDeletePamphlet,
        restoreTvContent, permanentlyDeleteTvContent,
        restoreKioskUser, permanentlyDeleteKioskUser,
        isScreensaverActive, isScreensaverEnabled, toggleScreensaver, exitScreensaver,
        localVolume, setLocalVolume: setLocalVolume,
        activeTvContent, playTvContent, stopTvContent,
        setIsOnAdminPage,
        pdfModalState, bookletModalState, clientDetailsModalState, openDocument, closePdfModal, closeBookletModal, openClientDetailsModal, closeClientDetailsModal,
        confirmation, showConfirmation, hideConfirmation,
        theme, toggleTheme,
        deferredPrompt, triggerInstallPrompt,
        storageProvider, connectToLocalProvider, connectToCloudProvider, connectToSharedUrl,
        disconnectFromStorage, isStorageConnected, directoryHandle,
        saveFileToStorage, deleteFileFromStorage, deleteDirectoryFromStorage, getFileUrl,
        saveDatabaseToLocal, loadDatabaseFromLocal,
        pushToCloud, pullFromCloud,
        syncStatus,
        trackBrandView, trackProductView,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};