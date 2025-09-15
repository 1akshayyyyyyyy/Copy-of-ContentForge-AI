import React from 'react';

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => {
    return (
        <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-10">
            <div className="w-12 h-12 border-4 border-t-primary border-r-primary border-secondary rounded-full animate-spin"></div>
            {message && <p className="mt-4 text-md text-foreground">{message}</p>}
        </div>
    );
};