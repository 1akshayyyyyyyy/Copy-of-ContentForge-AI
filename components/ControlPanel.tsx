import React, { useState } from 'react';
import type { RunReport } from '../types';
import { DoubleArrowLeftIcon } from './icons/DoubleArrowLeftIcon';

interface ControlPanelProps {
    onGenerate: (topic: string, count: number) => void;
    isLoading: boolean;
    report: RunReport | null;
    error: string | null;
    onToggleSidebar?: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onGenerate, isLoading, report, error, onToggleSidebar }) => {
    const [topic, setTopic] = useState<string>('AI in Frontend Development');
    const [count, setCount] = useState<number>(2);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (topic && count > 0 && !isLoading) {
            onGenerate(topic, count);
        }
    };

    return (
        <div className="bg-card p-4 rounded-lg h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-primary">Control Panel</h2>
                {onToggleSidebar && (
                    <button 
                        onClick={onToggleSidebar} 
                        className="p-1 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        aria-label="Collapse sidebar"
                    >
                        <DoubleArrowLeftIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="topic" className="block text-sm font-medium text-foreground/80 mb-1">Topic</label>
                    <input
                        id="topic"
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full bg-input border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label htmlFor="count" className="block text-sm font-medium text-foreground/80 mb-1">Items per Source</label>
                    <input
                        id="count"
                        type="number"
                        min="1"
                        max="5"
                        value={count}
                        onChange={(e) => setCount(parseInt(e.target.value, 10))}
                        className="w-full bg-input border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                        disabled={isLoading}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading || !topic || count < 1}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-md disabled:bg-muted disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? 'Processing...' : 'Forge Content'}
                </button>
            </form>
            
            {error && <div className="mt-4 bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md">{error}</div>}

            {report && (
                <div className="mt-6 pt-4 border-t border-border flex-grow overflow-y-auto">
                    <h3 className="text-lg font-semibold text-primary mb-2">Run Report</h3>
                    <div className="space-y-3 text-sm">
                        <p><strong>Total Items Fetched:</strong> {report.totalItemsFetched}</p>
                        <p><strong>Duplicates Found:</strong> {report.duplicatesFound}</p>
                        <div>
                            <strong>By Source:</strong>
                            <ul className="list-disc list-inside ml-4">
                                {Object.entries(report.itemsPerSource).map(([source, num]) => (
                                    <li key={source}>{source}: {num}</li>
                                ))}
                            </ul>
                        </div>

                        {report.groundingChunks && report.groundingChunks.length > 0 && (
                            <div>
                                <strong className="text-primary/90">Sources Used by AI:</strong>
                                <ul className="list-disc list-inside ml-4 space-y-1 mt-1">
                                    {report.groundingChunks.map((chunk, i) => (
                                        <li key={i} className="truncate">
                                            <a 
                                                href={chunk.web.uri} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="text-foreground/80 hover:underline hover:text-primary"
                                                title={chunk.web.title || chunk.web.uri}
                                            >
                                                {chunk.web.title || chunk.web.uri}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {report.errors.length > 0 && (
                             <div>
                                <strong className="text-red-400">Errors ({report.errors.length}):</strong>
                                <ul className="list-disc list-inside ml-4 text-red-400/80">
                                    {report.errors.map((err, i) => (
                                        <li key={i}>{err.length > 50 ? err.substring(0, 50) + '...' : err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
