import React, { useState, useCallback } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ContentList } from './components/ContentList';
import { DetailView } from './components/DetailView';
import { LoadingSpinner } from './components/LoadingSpinner';
import type { ProcessedItem, RunReport } from './types';
import { generateContent, generateMarkdown, analyzeContent } from './services/geminiService';
import { createHash } from './utils/hashing';
import { DoubleArrowRightIcon } from './components/icons/DoubleArrowRightIcon';

const App: React.FC = () => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [contentItems, setContentItems] = useState<ProcessedItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<ProcessedItem | null>(null);
    const [runReport, setRunReport] = useState<RunReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);

    // FIX: Removed useCallback to simplify the function and resolve potential scoping issues that may be causing the cascade of "Cannot find name" errors.
    const handleGenerate = async (topic: string, count: number) => {
        setIsLoading(true);
        setError(null);
        setContentItems([]);
        setSelectedItem(null);
        setRunReport(null);
        
        const report: RunReport = {
            totalItemsFetched: 0,
            itemsPerSource: {},
            duplicatesFound: 0,
            errors: [],
            warnings: [],
            groundingChunks: []
        };
        const seenHashes = new Set<string>();

        try {
            // Step 1: Generate initial content
            setLoadingMessage(`Searching for content about "${topic}"...`);
            const { content: rawContent, groundingChunks } = await generateContent(topic, count);
            report.totalItemsFetched = rawContent.length;
            report.groundingChunks = groundingChunks;
            
            rawContent.forEach(item => {
                report.itemsPerSource[item.source] = (report.itemsPerSource[item.source] || 0) + 1;
            });

            const processedItems: ProcessedItem[] = [];

            // Step 2 & 3: Analyze each item and generate markdown
            for (let i = 0; i < rawContent.length; i++) {
                const item = rawContent[i];
                try {
                    setLoadingMessage(`Analyzing item ${i + 1}/${rawContent.length}: "${item.title}"`);
                    const analysis = await analyzeContent(item);

                    // Fix: The 'title' property exists on 'item' (RawContentItem), not on 'analysis' (AnalyzedData).
                    const hash = createHash(`${item.title}${analysis.summaries.medium}${item.source}`);
                    const isDuplicate = seenHashes.has(hash);
                    if (isDuplicate) {
                        report.duplicatesFound++;
                    } else {
                        seenHashes.add(hash);
                    }
                    
                    setLoadingMessage(`Generating draft ${i + 1}/${rawContent.length}: "${item.title}"`);
                    const markdown = await generateMarkdown({ ...item, ...analysis });

                    processedItems.push({
                        ...item,
                        ...analysis,
                        id: `${item.source}-${i}`,
                        markdown,
                        isDuplicate,
                        createdAt: new Date().toISOString(),
                    });
                } catch (e) {
                    const errorMessage = `Failed to process item: ${item.title}. Reason: ${e instanceof Error ? e.message : 'Unknown error'}`;
                    console.error(errorMessage, e);
                    report.errors.push(errorMessage);
                }
            }
            
            setContentItems(processedItems);
            if (processedItems.length > 0) {
              setSelectedItem(processedItems[0]);
            }

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
            console.error('Generation process failed:', e);
            setError(`Generation failed: ${errorMessage}`);
            report.errors.push(errorMessage);
        } finally {
            setRunReport(report);
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleSelectItem = (item: ProcessedItem) => {
        setSelectedItem(item);
    };

    // FIX: Removed useCallback to simplify the function and resolve potential scoping issues. The dependency on `selectedItem` is now handled by the function closing over the latest state on each render.
    const handleUpdateItem = (updatedItem: ProcessedItem) => {
        setContentItems(currentItems => 
            currentItems.map(item => item.id === updatedItem.id ? updatedItem : item)
        );
        if (selectedItem?.id === updatedItem.id) {
            setSelectedItem(updatedItem);
        }
    };


    return (
        <div className="min-h-screen font-sans">
            <header className="bg-secondary p-4 shadow-lg flex items-center space-x-3">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                <h1 className="text-2xl font-bold text-foreground">ContentForge AI</h1>
            </header>
            <main className="flex flex-col md:flex-row p-4 gap-4 h-[calc(100vh-72px)]">
                {isLoading && <LoadingSpinner message={loadingMessage} />}
                
                {sidebarVisible && (
                    <>
                        <div className="w-full md:w-1/3 xl:w-1/4 flex-shrink-0">
                            <ControlPanel onGenerate={handleGenerate} isLoading={isLoading} report={runReport} error={error} onToggleSidebar={() => setSidebarVisible(false)}/>
                        </div>
                        <div className="w-full md:w-1/3 xl:w-1/4 flex-shrink-0 overflow-y-auto bg-card rounded-lg p-2">
                            <ContentList items={contentItems} onSelectItem={handleSelectItem} selectedItem={selectedItem} />
                        </div>
                    </>
                )}

                <div className={`w-full overflow-y-auto bg-card rounded-lg relative ${sidebarVisible ? 'md:w-1/2 xl:w-2/4 flex-grow' : 'flex-grow'}`}>
                     {!sidebarVisible && (
                        <button 
                            onClick={() => setSidebarVisible(true)} 
                            className="absolute top-4 left-4 z-20 p-2 bg-accent/80 rounded-full hover:bg-accent transition-colors"
                            aria-label="Show sidebar"
                        >
                           <DoubleArrowRightIcon className="w-5 h-5 text-foreground" />
                        </button>
                    )}
                    <DetailView item={selectedItem} onUpdateItem={handleUpdateItem} isSidebarCollapsed={!sidebarVisible} />
                </div>
            </main>
        </div>
    );
};

export default App;
