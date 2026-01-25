import React from 'react';
import Card from '../../../shared/components/ui/Card.jsx';

// Placeholder for the main Dashboard page content.
const PlaceholderContent = ({ title, children }) => (
    <Card className="p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <p className="mt-2 text-gray-600">{children}</p>
    </Card>
);

export default function DashboardPage() {
    return (
        <PlaceholderContent title="Dashboard">
            Welcome to the Nuur Al-Bayaan Academic Management System. This section will contain summary statistics and quick access links.
        </PlaceholderContent>
    );
}
