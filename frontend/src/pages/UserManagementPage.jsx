import React, { useState } from 'react';
import DataToolbar from '../components/common/DataToolbar/DataToolbar';
import SearchInput from '../components/common/DataToolbar/SearchInput';

export default function UserManagementPage() {
    const [search, setSearch] = useState('');

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
                    <p className="mt-1 text-sm text-gray-600">Administer system users and roles (placeholder UI).</p>
                </div>
            </div>

            <DataToolbar
                showReset={false}
                searchSlot={<SearchInput value={search} onChange={setSearch} placeholder="Search users..." />}
                filtersSlot={<div className="flex flex-row flex-wrap gap-2 w-full items-center">
                    <div className="flex items-center gap-2 ml-auto flex-wrap">
                        <button
                            type="button"
                            onClick={() => { setSearch(''); }}
                            className="px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md border text-sm"
                        >Reset</button>
                    </div>
                </div>}
            />

            <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Users</h2>
                <p className="text-sm text-gray-600">This area will later include listing, role assignment, activation and audit controls.</p>
                <div className="mt-4 text-xs text-gray-500">(Feature pending backend endpoints)</div>
            </div>
        </div>
    );
}
