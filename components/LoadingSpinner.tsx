import React from 'react';

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center h-full min-h-[calc(100vh-200px)]">
    <div className="w-16 h-16 border-4 border-gray-300 dark:border-gray-600 border-t-[var(--primary-color)] rounded-full animate-spin"></div>
  </div>
);

export default LoadingSpinner;
