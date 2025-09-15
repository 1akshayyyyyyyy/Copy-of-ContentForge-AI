import React, { useState, useEffect } from 'react';
import type { ProcessedItem } from '../types';
import { generateImage } from '../services/geminiService';
import { ImageIcon } from './icons/ImageIcon';
import { LoadingSpinner } from './LoadingSpinner';

type ViewMode = 'markdown' | 'json';

interface DetailViewProps {
    item: ProcessedItem | null;
    onUpdateItem: (item: ProcessedItem) => void;
    isSidebarCollapsed?: boolean;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                active ? 'bg-secondary text-primary border-b-2 border-primary' : 'bg-transparent text-muted-foreground hover:bg-accent'
            }`}
        >
            {children}
        </button>
    );
};

const StyledMarkdownPreview: React.FC<{ content: string }> = ({ content }) => {
    // This is a simple renderer. For a real app, a library like react-markdown is better.
    const renderLine = (line: string, index: number) => {
        if (line.startsWith('---')) return null; // Hide frontmatter delimiters
        if (line.startsWith('## ')) return <h2 key={index} className="text-2xl font-bold mt-6 mb-3 text-primary border-b border-border pb-2">{line.substring(3)}</h2>;
        if (line.startsWith('# ')) return <h1 key={index} className="text-3xl font-extrabold mt-4 mb-4 text-foreground">{line.substring(2)}</h1>;
        if (line.startsWith('> ')) return <blockquote key={index} className="border-l-4 border-primary pl-4 my-4 text-foreground/90 italic">{line.substring(2)}</blockquote>;
        if (line.startsWith('* ')) return <li key={index} className="ml-5 list-disc">{line.substring(2)}</li>;
        if (line.trim() === '') return <br key={index} />;

        // Basic inline styling for bold
        const parts = line.split(/(\*\*.*?\*\*)/g);

        return (
            <p key={index} className="my-3 leading-relaxed">
                {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i}>{part.slice(2, -2)}</strong>;
                    }
                    return part;
                })}
            </p>
        );
    };

    const frontmatterMatch = content.match(/---\n([\s\S]*?)\n---/);
    const frontmatter = frontmatterMatch ? frontmatterMatch[1] : '';
    const body = frontmatterMatch ? content.substring(frontmatterMatch[0].length).trim() : content;
    
    return (
         <div className="prose prose-invert prose-lg max-w-none p-6 bg-background rounded-b-lg font-serif">
             {frontmatter && (
                <div className="mb-6 bg-secondary p-4 rounded-md border border-border">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2 font-sans">FRONTMATTER</h3>
                    <pre className="text-sm text-foreground/90 font-mono whitespace-pre-wrap"><code>{frontmatter}</code></pre>
                </div>
             )}
            {body.split('\n').map(renderLine)}
        </div>
    );
};


const JsonView: React.FC<{ data: object }> = ({ data }) => (
     <pre className="whitespace-pre-wrap bg-background p-4 rounded-b-lg text-sm font-mono overflow-x-auto">
        <code>{JSON.stringify(data, null, 2)}</code>
    </pre>
);

const ImageGenerator: React.FC<{ item: ProcessedItem; onUpdateItem: (item: ProcessedItem) => void; }> = ({ item, onUpdateItem }) => {
    const styles = {
        'Vibrant Vector': 'vibrant vector art, graphic illustration, bold colors, clean lines',
        'Cartoon': 'fun cartoon style, whimsical, animated movie still',
        'Dynamic Illustration': 'dynamic and iconic illustration, powerful imagery, dramatic lighting, heroic style',
        'Photorealistic': 'photorealistic, cinematic, 8k, high detail, professional photography',
    };
    type StyleKey = keyof typeof styles;

    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [selectedStyle, setSelectedStyle] = useState<StyleKey>('Vibrant Vector');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [setButtonText, setSetButtonText] = useState('Set as Thumbnail');

    useEffect(() => {
        setPrompt(`A blog post thumbnail for an article titled "${item.title}". Keywords: ${item.keywords.slice(0, 3).join(', ')}.`);
        setGeneratedImage(null);
        setError(null);
        setSetButtonText('Set as Thumbnail');
    }, [item]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        setGeneratedImage(null);
        try {
            const fullPrompt = `${prompt}, in the style of ${styles[selectedStyle]}.`;
            const imageUrl = await generateImage(fullPrompt);
            setGeneratedImage(imageUrl);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred during image generation.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSetThumbnail = () => {
        if (!generatedImage) return;
        
        // This is a more robust way to replace the thumbnail in YAML frontmatter
        const newMarkdown = item.markdown.replace(
            /^(thumbnail:\s*['"]?)(.*)(['"]?\s*)$/m, 
            `$1${generatedImage}$3`
        );

        const updatedItem: ProcessedItem = {
            ...item,
            thumbnailUrl: generatedImage,
            markdown: newMarkdown,
        };
        onUpdateItem(updatedItem);

        setSetButtonText('Set!');
        setTimeout(() => setSetButtonText('Set as Thumbnail'), 2000);
    };

    const handleDownload = () => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `${item.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}_thumbnail.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="my-4 p-4 bg-secondary/70 rounded-lg border border-border">
            <h3 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Thumbnail Generator
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <div className="mb-3">
                        <label className="block text-sm font-medium text-foreground/80 mb-1">Style</label>
                        <div className="flex flex-wrap gap-2">
                            {(Object.keys(styles) as StyleKey[]).map(styleKey => (
                                <button
                                    key={styleKey}
                                    onClick={() => setSelectedStyle(styleKey)}
                                    disabled={isGenerating}
                                    className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 ${
                                        selectedStyle === styleKey ? 'bg-primary text-primary-foreground' : 'bg-accent hover:bg-accent/80'
                                    }`}
                                >
                                    {styleKey}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mb-3">
                        <label htmlFor="prompt" className="block text-sm font-medium text-foreground/80 mb-1">Prompt</label>
                        <textarea
                            id="prompt"
                            rows={3}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            disabled={isGenerating}
                            className="w-full bg-input border border-border rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                        />
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-md disabled:bg-muted disabled:cursor-not-allowed transition-colors"
                    >
                        {isGenerating ? 'Generating...' : 'Generate Image'}
                    </button>
                </div>
                <div className="flex flex-col items-center justify-center bg-background/50 rounded-md min-h-[200px] p-2">
                    {isGenerating && <LoadingSpinner message="Conjuring pixels..." />}
                    {!isGenerating && error && <div className="text-center text-red-400 text-sm p-3">{error}</div>}
                    {!isGenerating && generatedImage && (
                        <div className="w-full text-center">
                            <img src={generatedImage} alt="Generated thumbnail" className="rounded-md w-full object-contain max-h-48" />
                            <div className="flex gap-2 mt-2 justify-center">
                                <button onClick={handleSetThumbnail} className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-1 px-3 rounded-md transition-colors">{setButtonText}</button>
                                <button onClick={handleDownload} className="bg-gray-600 hover:bg-gray-500 text-white text-xs font-bold py-1 px-3 rounded-md transition-colors">Download</button>
                            </div>
                        </div>
                    )}
                    {!isGenerating && !error && !generatedImage && <p className="text-muted-foreground text-sm">Image will appear here</p>}
                </div>
            </div>
        </div>
    );
};


export const DetailView: React.FC<DetailViewProps> = ({ item, onUpdateItem, isSidebarCollapsed = false }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('markdown');
    const [copyButtonText, setCopyButtonText] = useState('Copy Markdown');

    useEffect(() => {
        setViewMode('markdown');
    }, [item]);

    const handleCopy = () => {
        if (item) {
            navigator.clipboard.writeText(item.markdown);
            setCopyButtonText('Copied!');
            setTimeout(() => setCopyButtonText('Copy Markdown'), 2000);
        }
    };

    if (!item) {
        return (
            <div className={`flex items-center justify-center h-full text-muted-foreground ${isSidebarCollapsed ? 'pl-16' : ''}`}>
                <p>Select an item to see its details.</p>
            </div>
        );
    }
    
    return (
        <div className={`p-4 h-full flex flex-col ${isSidebarCollapsed ? 'md:pl-20' : ''}`}>
             <div className="flex-shrink-0">
                <h2 className="text-2xl font-bold text-foreground">{item.title}</h2>
                <a href={item.permalink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">{item.permalink}</a>
                <div className="mt-2 flex flex-wrap gap-2">
                    {item.tags.map(tag => (
                        <span key={tag} className="bg-accent text-primary text-xs font-medium px-2.5 py-0.5 rounded-full">{tag}</span>
                    ))}
                </div>
            </div>
            
            <ImageGenerator item={item} onUpdateItem={onUpdateItem} />

            <div className="flex-shrink-0 border-b border-border flex justify-between items-center">
                 <div>
                    <TabButton active={viewMode === 'markdown'} onClick={() => setViewMode('markdown')}>
                        Medium Preview
                    </TabButton>
                    <TabButton active={viewMode === 'json'} onClick={() => setViewMode('json')}>
                        Full JSON
                    </TabButton>
                </div>
                {viewMode === 'markdown' && (
                    <button 
                        onClick={handleCopy}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold py-1.5 px-3 rounded-md transition-colors"
                    >
                        {copyButtonText}
                    </button>
                )}
            </div>

            <div className="flex-grow overflow-y-auto">
                {viewMode === 'markdown' && <StyledMarkdownPreview content={item.markdown} />}
                {viewMode === 'json' && <JsonView data={item} />}
            </div>
        </div>
    );
};