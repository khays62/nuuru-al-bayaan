import React from 'react';
import { X } from 'lucide-react';

// A reusable Modal component with a professional backdrop blur effect.
const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    panelClassName = '',
    headerClassName = '',
    titleClassName = '',
    closeButtonClassName = '',
    closeOnBackdrop = true,
    showCloseButton = true,
}) => {
    // If the modal is not open, render nothing.
    if (!isOpen) return null;

    const canClose = typeof onClose === 'function';
    const handleBackdropClick = canClose && closeOnBackdrop ? onClose : undefined;
    const isTitlePrimitive = typeof title === 'string' || typeof title === 'number';
    const closeBtnClass = closeButtonClassName || 'text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 transition-colors';

    return (
        // Main overlay container.
        // It now uses a semi-transparent background with a backdrop blur effect.
        // `transition-opacity` and `duration-300` create a smooth fade-in effect.
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-opacity duration-300"
            onClick={handleBackdropClick} // Optional: close by clicking the backdrop
        >
            {/* Modal Panel. 
                `onClick={(e) => e.stopPropagation()}` prevents the modal from closing when clicking inside it.
                `animate-scale-in` is a custom animation for a subtle zoom-in effect.
            */}
            <div 
                className={`bg-white rounded-lg shadow-xl w-full ${panelClassName || 'max-w-2xl'} transform transition-transform duration-300 scale-95 animate-scale-in modal-panel`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className={`p-4 border-b flex justify-between items-center modal-header ${headerClassName}`.trim()}>
                    <h3 className={`${isTitlePrimitive ? 'text-lg font-semibold text-gray-800' : 'text-left w-full'} ${titleClassName}`.trim()}>{title}</h3>
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
                <div className="p-6 modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;

