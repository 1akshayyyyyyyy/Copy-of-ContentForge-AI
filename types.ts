
export type Source = 'YouTube' | 'Reddit' | 'News';

export interface RawContentItem {
    source: Source;
    sourceId: string;
    permalink: string;
    title: string;
    creator: string;
    publishDate: string;
    thumbnailUrl: string;
    fullText: string;
    topComments: { author: string; text: string }[];
}

export interface AnalyzedData {
    keywords: string[];
    seoTitles: string[];
    tags: string[];
    summaries: {
        short: string;
        medium: string;
        long: string;
    };
    sentiment: 'positive' | 'neutral' | 'negative';
    readingTimeMinutes: number;
    thumbnail: {
      altText: string;
      credit: string;
    };
}

export interface ProcessedItem extends RawContentItem, AnalyzedData {
    id: string;
    markdown: string;
    isDuplicate: boolean;
    createdAt: string;
}

export interface GroundingChunk {
    web: {
        uri: string;
        title: string;
    };
}

export interface RunReport {
    totalItemsFetched: number;
    itemsPerSource: { [key: string]: number };
    duplicatesFound: number;
    errors: string[];
    warnings: string[];
    groundingChunks?: GroundingChunk[];
}
