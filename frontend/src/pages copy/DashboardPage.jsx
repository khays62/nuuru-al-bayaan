import React from 'react';

// Placeholder for the main Dashboard page content.
const PlaceholderContent = ({ title, children }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <p className="mt-2 text-gray-600">{children}</p>
    </div>
);

export default function DashboardPage() {
    return (
        <PlaceholderContent title="Dashboard">
            Welcome to the Nuur Al-Bayaan Academic Management System. This section will contain summary statistics and quick access links.
        </PlaceholderContent>
    );
}
