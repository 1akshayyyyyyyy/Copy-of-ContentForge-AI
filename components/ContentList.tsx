
import React from 'react';
import type { ProcessedItem } from '../types';
import { ContentItemCard } from './ContentItemCard';

interface ContentListProps {
    items: ProcessedItem[];
    onSelectItem: (item: ProcessedItem) => void;
    selectedItem: ProcessedItem | null;
}

export const ContentList: React.FC<ContentListProps> = ({ items, onSelectItem, selectedItem }) => {
    if (items.length === 0) {
        return (
            <div className="text-center text-gray-500 p-4">
                <p>No content generated yet.</p>
                <p className="text-sm">Use the control panel to start.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-2">
            {items.map(item => (
                <ContentItemCard 
                    key={item.id} 
                    item={item} 
                    onSelect={() => onSelectItem(item)}
                    isSelected={selectedItem?.id === item.id}
                />
            ))}
        </div>
    );
};
