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

