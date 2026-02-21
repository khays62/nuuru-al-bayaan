// TableShell.jsx
// Wrapper yar oo isku keena paper + table styles si ay miisasku u ekaadaan kuwo isku mid ah.
// Contract: children (thead/tbody/tfoot ee table‑ga). Styling waxa lagu maamulaa Tailwind classes, ma aha CSS custom.
import React from 'react';
import Card from '../ui/Card.jsx';

export default function TableShell({ children, className = '' }) {
	return (
		<Card className={`overflow-x-auto border-0 rounded-(--nb-radius-md) ring-1 ring-(--nb-color-border) ${className}`.trim()}>
			<table className="w-full text-sm border-collapse">
				{children}
			</table>
		</Card>
	);
}
