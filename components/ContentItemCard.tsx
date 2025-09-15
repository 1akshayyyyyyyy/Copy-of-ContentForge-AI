
import React from 'react';
import type { ProcessedItem, Source } from '../types';
import { YoutubeIcon } from './icons/YoutubeIcon';
import { RedditIcon } from './icons/RedditIcon';
import { NewsIcon } from './icons/NewsIcon';

interface ContentItemCardProps {
    item: ProcessedItem;
    onSelect: () => void;
    isSelected: boolean;
}

const SourceIcon: React.FC<{ source: Source }> = ({ source }) => {
    switch (source) {
        case 'YouTube': return <YoutubeIcon className="w-5 h-5" />;
        case 'Reddit': return <RedditIcon className="w-5 h-5" />;
        case 'News': return <NewsIcon className="w-5 h-5" />;
        default: return null;
    }
};

export const ContentItemCard: React.FC<ContentItemCardProps> = ({ item, onSelect, isSelected }) => {
    const cardClasses = `
        block p-3 rounded-lg cursor-pointer transition-all duration-200 ease-in-out 
        ${isSelected ? 'bg-accent/50 ring-2 ring-ring' : 'bg-secondary hover:bg-accent/80'}
    `;

    return (
        <div onClick={onSelect} className={cardClasses}>
            <div className="flex items-start gap-3">
                <img src={item.thumbnailUrl} alt={item.thumbnail.altText} className="w-16 h-16 object-cover rounded-md flex-shrink-0 bg-muted" />
                <div className="flex-grow">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <div className="flex items-center gap-1.5">
                            <SourceIcon source={item.source} />
                            <span>{item.source}</span>
                        </div>
                        {item.isDuplicate && <span className="text-xs bg-yellow-800 text-yellow-200 px-1.5 py-0.5 rounded">DUPE</span>}
                    </div>
                    <h4 className="font-semibold text-sm text-card-foreground line-clamp-2">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">by {item.creator}</p>
                </div>
            </div>
        </div>
    );
};