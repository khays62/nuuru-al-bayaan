// TableShell.jsx
// Wrapper yar oo isku keena paper + table styles si ay miisasku u ekaadaan kuwo isku mid ah.
// Contract: children (thead/tbody/tfoot ee table‑ga). Styling waxa lagu maamulaa Tailwind classes, ma aha CSS custom.
import React from 'react';

export default function TableShell({ children, className = '' }) {
	return (
		<div className={`overflow-x-auto bg-white rounded-xl shadow ring-1 ring-gray-200 ${className}`.trim()}>
			<table className="w-full text-sm border-collapse">
				{children}
			</table>
		</div>
	);
}
