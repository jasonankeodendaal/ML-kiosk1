import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from './context/AppContext.tsx';
import { EyeIcon, EyeOffIcon, ClipboardDocumentListIcon } from './Icons.tsx';
import PamphletDisplay from './PamphletCarousel.tsx';
import LocalMedia from './LocalMedia.tsx';
import InstallPrompt from './InstallPrompt.tsx';

const BrandGrid: React.FC = () => {
    const { brands } = useAppContext();

    return (
        <div>
            <h2 className="text-2xl tracking-tight text-gray-900 dark:text-gray-100 mb-6 section-heading">Shop by Brand</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 items-center">
                {brands.filter(brand => !brand.isDeleted).map((brand) => (
                    <Link
                        key={brand.id}
                        to={`/brand/${brand.id}`}
                        className="brand-grid-item group"
                        title={brand.name}
                    >
                        <LocalMedia
                            src={brand.logoUrl}
                            alt={`${brand.name} Logo`}
                            type="image"
                            className="object-contain"
                        />
                    </Link>
                ))}
            </div>
        </div>
    );
}

const ScreensaverToggle: React.FC = () => {
    const { isScreensaverEnabled, toggleScreensaver } = useAppContext();
    
    const baseClasses = "inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:ring-offset-gray-800 transition-all";

    const onClasses = "bg-green-100 dark:bg-green-800/60 text-green-800 dark:text-green-100 border border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-700/80 focus:ring-green-500";
    
    const offClasses = "bg-red-100 dark:bg-red-800/60 text-red-800 dark:text-red-100 border border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-700/80 focus:ring-red-500";


    return (
        <div className="text-center mt-12 py-6 border-t border-black/10 dark:border-white/10">
             <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Kiosk Control</h3>
            <button
                onClick={toggleScreensaver}
                className={`${baseClasses} ${isScreensaverEnabled ? onClasses : offClasses}`}
                aria-live="polite"
            >
                {isScreensaverEnabled ? (
                    <>
                        <EyeIcon className="h-5 w-5" />
                        <span>Auto Screensaver On</span>
                    </>
                ) : (
                    <>
                        <EyeOffIcon className="h-5 w-5" />
                        <span>Auto Screensaver Off</span>
                    </>
                )}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-3 max-w-md mx-auto">
                {isScreensaverEnabled 
                    ? "Screensaver will start after inactivity."
                    : "Screensaver is disabled."
                }
            </p>
        </div>
    );
};

const StockPickCta: React.FC = () => {
    const { loggedInUser, openClientDetailsModal } = useAppContext();
    const navigate = useNavigate();

    const handleClick = () => {
        openClientDetailsModal(clientId => {
            navigate('/stock-pick', { state: { clientId } });
        });
    };

    if (!loggedInUser) {
        return null;
    }

    return (
        <button
            onClick={handleClick}
            className="group block text-left bg-indigo-600 dark:bg-indigo-500 p-6 rounded-2xl shadow-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all hover:shadow-2xl hover:-translate-y-1 w-full"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold text-white section-heading">Create a Client Stock Pick</h3>
                    <p className="text-indigo-200 dark:text-indigo-100 mt-1">Select products to generate a quote for a client.</p>
                </div>
                <div className="bg-white/20 p-4 rounded-full transition-transform group-hover:scale-110">
                    <ClipboardDocumentListIcon className="h-8 w-8 text-white" />
                </div>
            </div>
        </button>
    );
};


const Home: React.FC = () => {
  return (
    <div className="space-y-12">
      <PamphletDisplay />
      <StockPickCta />
      <BrandGrid />
      <InstallPrompt />
      <ScreensaverToggle />
    </div>
  );
};

export default Home;
