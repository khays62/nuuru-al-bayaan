import React from 'react';

export default function NotFoundPage() {
  return (
  <div className="min-h-[70vh] flex flex-col items-center justify-center text-center gap-8 p-6">
      {/* Animated icon */}
      <div className="relative">
        <div className="w-40 h-40 rounded-full border-8 border-gray-200 flex items-center justify-center shadow-sm">
          <div className="w-28 h-28 rounded-full border-8 border-blue-500 border-t-transparent animate-spin" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl font-black text-gray-300 select-none">404</span>
        </div>
      </div>
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Page Not Found</h1>
        <p className="mt-2 text-gray-600 max-w-xl mx-auto">
          The page you’re looking for doesn’t exist or may have moved.
        </p>
      </div>
    </div>
  );
}
