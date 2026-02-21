import React from 'react';
import { X } from 'lucide-react';

import { cn } from '../../utils/cn';

// A reusable Modal component with a professional backdrop blur effect.
const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    overlayClassName = '',
    panelClassName = '',
    headerClassName = '',
    titleClassName = '',
    closeButtonClassName = '',
    bodyClassName = '',
    closeOnBackdrop = true,
    showCloseButton = true,
}) => {
    // If the modal is not open, render nothing.
    if (!isOpen) return null;

    const canClose = typeof onClose === 'function';
    const handleBackdropClick = canClose && closeOnBackdrop ? onClose : undefined;
    const isTitlePrimitive = typeof title === 'string' || typeof title === 'number';
    const closeBtnClass = closeButtonClassName || 'text-(--nb-color-muted) hover:text-(--nb-color-fg) p-1 rounded-(--nb-radius-sm) hover:bg-(--nb-color-brand-50) transition-colors';

    return (
        // Main overlay container.
        // It now uses a semi-transparent background with a backdrop blur effect.
        // `transition-opacity` and `duration-300` create a smooth fade-in effect.
        <div
            className={cn(
                'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-opacity duration-300',
                overlayClassName
            )}
            onClick={handleBackdropClick}
        >
            {/* Modal Panel. 
                `onClick={(e) => e.stopPropagation()}` prevents the modal from closing when clicking inside it.
                `animate-scale-in` is a custom animation for a subtle zoom-in effect.
            */}
            <div
                className={cn(
                    'w-full transform transition-transform duration-300 scale-95 animate-scale-in modal-panel',
                    'bg-(--nb-color-bg-card) rounded-(--nb-radius-md) border border-(--nb-color-border) shadow-(--nb-shadow-md)',
                    panelClassName || 'max-w-2xl'
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className={cn('p-4 border-b border-(--nb-color-border) flex justify-between items-center modal-header', headerClassName)}>
                    <h3 className={cn(isTitlePrimitive ? 'text-lg font-semibold text-(--nb-color-fg)' : 'text-left w-full', titleClassName)}>{title}</h3>
                    {showCloseButton && canClose ? (
                        <button 
                            onClick={onClose} 
                            className={closeBtnClass}
                        >
                            <X size={24} />
                        </button>
                    ) : null}
                </div>
                {/* Modal Body */}
                <div className={cn('p-6 modal-body', bodyClassName)}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;

