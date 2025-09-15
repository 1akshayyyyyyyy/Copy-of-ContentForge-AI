import { GoogleGenAI, Type } from "@google/genai";
import type { RawContentItem, AnalyzedData, GroundingChunk } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 8 keywords max." },
        seoTitles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 SEO-friendly title variations." },
        tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 recommended tags." },
        summaries: {
            type: Type.OBJECT,
            properties: {
                short: { type: Type.STRING, description: "1-2 sentences." },
                medium: { type: Type.STRING, description: "3-5 sentences." },
                long: { type: Type.STRING, description: "6-12 sentences." },
            },
            required: ["short", "medium", "long"]
        },
        sentiment: { type: Type.STRING, enum: ["positive", "neutral", "negative"] },
        readingTimeMinutes: { type: Type.INTEGER, description: "Estimated reading time at 200 WPM." },
        thumbnail: {
            type: Type.OBJECT,
            properties: {
                altText: { type: Type.STRING },
                credit: { type: Type.STRING, description: "Credit line for the thumbnail image, e.g., 'Photo by [Creator]'"}
            },
            required: ["altText", "credit"]
        }
    },
    required: ["keywords", "seoTitles", "tags", "summaries", "sentiment", "readingTimeMinutes", "thumbnail"]
};


export const generateContent = async (topic: string, count: number): Promise<{ content: RawContentItem[], groundingChunks: GroundingChunk[] }> => {
    try {
        const prompt = `
        You are an expert research assistant. Your task is to find real, trending content from the web about a specific topic.
        
        Topic: "${topic}"
        Number of items per source: ${count}
        Sources: YouTube, Reddit, News
        Timeframe: Last 12 months.

        Instructions:
        1. Find ${count} popular YouTube videos, ${count} popular Reddit posts, and ${count} recent news articles related to the topic.
        2. For each item, extract the following information:
            - source: 'YouTube', 'Reddit', or 'News'.
            - sourceId: The unique identifier from the platform (e.g., YouTube video ID). If not available, create a unique ID based on the title.
            - permalink: The exact, real URL to the content. This is critical.
            - title: The real title of the content.
            - creator: The name of the YouTube channel, Reddit user, or author.
            - publishDate: The actual publication date in ISO 8601 format.
            - thumbnailUrl: A URL to the actual thumbnail. If not available, use a placeholder like "https://picsum.photos/1200/800?random=${Math.random()}".
            - fullText: A detailed summary or transcript of the content. For Reddit, it should be the post body. For YouTube, a summary of the video. For News, the article content.
            - topComments: An array of 1-3 top comments, with author and text. If not available, provide an empty array [].
        
        Your response MUST be a single, valid JSON array of objects. Do not include any other text, explanations, or markdown formatting before or after the JSON array.
        The JSON should conform to this structure:
        [
          {
            "source": "YouTube",
            "sourceId": "some_video_id",
            "permalink": "https://www.youtube.com/watch?v=some_video_id",
            "title": "Real Video Title",
            "creator": "Real Channel Name",
            "publishDate": "YYYY-MM-DDTHH:MM:SSZ",
            "thumbnailUrl": "https://i.ytimg.com/vi/some_video_id/hqdefault.jpg",
            "fullText": "A detailed summary of the video content...",
            "topComments": [
              { "author": "commenter1", "text": "This was a great video!" }
            ]
          }
        ]
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            }
        });

        const jsonString = response.text.trim();
        const jsonMatch = jsonString.match(/```json\n([\s\S]*?)\n```/);
        const parsableString = jsonMatch ? jsonMatch[1] : jsonString;

        let content: RawContentItem[];
        try {
            const parsed = JSON.parse(parsableString);
            if (!Array.isArray(parsed)) {
                throw new Error("AI response is not a JSON array.");
            }
            content = parsed as RawContentItem[];
        } catch (e) {
            console.error("Failed to parse JSON response from AI:", parsableString);
            throw new Error("The AI returned a response that was not valid JSON. Please try again.");
        }
        
        const groundingChunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[]) || [];

        return { content, groundingChunks };

    } catch (error) {
        console.error("Error generating raw content:", error);
        if (error instanceof Error && error.message.includes("not valid JSON")) {
            throw error;
        }
        throw new Error("Failed to generate content from AI model.");
    }
};

export const analyzeContent = async (item: RawContentItem): Promise<AnalyzedData> => {
    try {
        const wpm = 200;
        const wordCount = item.fullText.split(/\s+/).length;
        const readingTime = Math.ceil(wordCount / wpm);

        const prompt = `You are ContentForge, an AI agent. Analyze the following content item and generate the required metadata. The reading time is already calculated as ${readingTime} minutes.
        
        Content:
        Title: ${item.title}
        Creator: ${item.creator}
        Text: ${item.fullText.substring(0, 4000)}...
        
        Generate all required fields according to the provided JSON schema.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: analysisSchema,
            }
        });

        const jsonString = response.text;
        const result = JSON.parse(jsonString);
        // Ensure reading time is what we calculated
        result.readingTimeMinutes = readingTime;
        return result as AnalyzedData;
    } catch (error) {
        console.error("Error analyzing content:", error);
        throw new Error("Failed to analyze content with AI model.");
    }
};


// Fix: The function is called before the full `ProcessedItem` is created.
// It only requires the data from `RawContentItem` and `AnalyzedData`.
export const generateMarkdown = async (item: RawContentItem & AnalyzedData): Promise<string> => {
    try {
        const prompt = `
        You are a blog post writer for Medium. Using the following JSON data, create a Medium-ready Markdown draft.
        
        Data:
        ${JSON.stringify({
            title: item.title,
            tags: item.tags,
            readingTime: item.readingTimeMinutes,
            thumbnailUrl: item.thumbnailUrl,
            canonicalUrl: item.permalink,
            summary: item.summaries.short,
            keyTakeaways: item.summaries.medium.split('. ').filter(s => s.length > 5),
            fullText: item.fullText,
            topComments: item.topComments,
            creator: item.creator,
            source: item.source
        }, null, 2)}
        
        Instructions:
        1. Create frontmatter as a YAML code block (---). Include 'title', 'canonical_url', 'tags' (as a YAML list), 'read_time', and 'thumbnail'. The thumbnail value should be a URL string.
        2. Write a short TL;DR section using a blockquote (>).
        3. Write a compelling introduction paragraph.
        4. Create a '## Key Takeaways' section with bullet points (*).
        5. Paraphrase the full content. NEVER copy the original text directly. Use short quotes only with proper attribution.
        6. Create a "## Top Comments" section if comments exist, using blockquotes for each comment.
        7. Create a "## Sources & Credits" section, linking to the original article and crediting the author.
        8. The output must be a single block of valid Markdown.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        return response.text;
    } catch (error) {
        console.error("Error generating markdown:", error);
        throw new Error("Failed to generate markdown with AI model.");
    }
};

export const generateImage = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '16:9',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        }
        
        throw new Error("No image was generated by the model.");

    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("Failed to generate image with AI model.");
    }
};
