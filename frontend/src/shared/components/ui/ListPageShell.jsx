import React from 'react';

export default function ListPageShell({
	title,
	actions,
	toolbar,
	children,
	className = '',
}) {
	return (
		<div className={`space-y-5 ${className}`.trim()}>
			{(title || actions) && (
				<div className="flex justify-between items-center">
					{title ? <h1 className="text-2xl font-bold">{title}</h1> : <div />}
					{actions ? <div className="flex items-center gap-2">{actions}</div> : null}
				</div>
			)}

			{toolbar ? <div>{toolbar}</div> : null}

			{children}
		</div>
	);
}
