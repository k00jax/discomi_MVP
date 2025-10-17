import OpenAI from "openai";

/**
 * AI-powered transcript analysis and summarization
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface CustomEntities {
  important_terms?: string[]; // User-provided list of names/terms to transcribe correctly
}

export interface ProcessedTranscript {
  summary: string;
  tasks: Task[];
  ideas: string[];
  category: string;
  sentiment: "positive" | "neutral" | "negative";
  key_entities: string[];
}

export interface Task {
  text: string;
  priority: "high" | "medium" | "low";
}

const SYSTEM_PROMPT = `You are an AI assistant that analyzes voice conversation transcripts.

Your job is to:
1. Create a clean, coherent 2-3 sentence summary (not bullet points)
2. Extract actionable tasks (must have verbs like: do, call, send, review, schedule, etc.)
3. Identify key ideas, insights, or important points
4. Categorize the conversation
5. Determine sentiment
6. Extract key entities (people, companies, dates)

Return ONLY valid JSON, no other text.`;

const USER_PROMPT_TEMPLATE = `Analyze this voice conversation transcript:

"""
{transcript}
"""

Return JSON in this exact format:
{
  "summary": "A coherent 2-3 sentence narrative summary of the conversation",
  "tasks": [
    {"text": "actionable task description", "priority": "high|medium|low"}
  ],
  "ideas": ["key insight or idea mentioned"],
  "category": "work|personal|meeting|brainstorm|note|other",
  "sentiment": "positive|neutral|negative",
  "key_entities": ["names", "companies", "dates", "locations mentioned"]
}

Rules:
- Summary must be narrative prose, not bullet points
- Tasks must be actionable with clear verbs
- Only include tasks if explicitly mentioned or strongly implied
- Ideas are insights, suggestions, or creative thoughts
- If no tasks/ideas, use empty arrays []
- Category should match the conversation's purpose`;

/**
 * Process a raw transcript with AI
 */
export async function processTranscript(
  rawTranscript: string,
  customEntities?: CustomEntities | null
): Promise<ProcessedTranscript | null> {
  // Skip if AI not configured
  if (!process.env.OPENAI_API_KEY) {
    console.log("[AI] OpenAI API key not configured, skipping AI processing");
    return null;
  }

  // Skip very short transcripts to save costs
  const minWords = parseInt(process.env.AI_MIN_WORDS || "20");
  const wordCount = rawTranscript.trim().split(/\s+/).length;
  
  if (wordCount < minWords) {
    console.log(`[AI] Transcript too short (${wordCount} words), skipping AI processing`);
    return null;
  }

  try {
    console.log(`[AI] Processing transcript (${wordCount} words)...`);
    
    // Build user prompt with optional important terms
    let userPrompt = USER_PROMPT_TEMPLATE.replace("{transcript}", rawTranscript);
    
    // Add important terms as context if provided
    if (customEntities?.important_terms && customEntities.important_terms.length > 0) {
      const termsList = customEntities.important_terms.join(", ");
      userPrompt += `\n\nIMPORTANT: When summarizing, ensure these names/terms are spelled correctly: ${termsList}`;
      console.log(`[AI] Using ${customEntities.important_terms.length} custom terms as dictionary`);
    }
    
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { 
          role: "user", 
          content: userPrompt
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower = more consistent
      max_tokens: parseInt(process.env.AI_MAX_TOKENS || "500"),
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("[AI] No response content from OpenAI");
      return null;
    }

    const parsed = JSON.parse(content) as ProcessedTranscript;
    
    // Validate required fields
    if (!parsed.summary || !parsed.category) {
      console.error("[AI] Missing required fields in AI response");
      return null;
    }

    console.log("[AI] Successfully processed transcript:", {
      summary_length: parsed.summary.length,
      tasks_count: parsed.tasks?.length || 0,
      ideas_count: parsed.ideas?.length || 0,
      category: parsed.category,
    });

    return parsed;
  } catch (error) {
    console.error("[AI] Error processing transcript:", error);
    return null;
  }
}

/**
 * Get cost estimate for processing
 */
export function estimateCost(wordCount: number): number {
  // Rough estimates for GPT-4o-mini
  const inputTokens = Math.ceil(wordCount * 1.3); // ~1.3 tokens per word
  const outputTokens = 200; // Average for structured response
  
  const inputCost = (inputTokens / 1_000_000) * 0.15; // $0.15 per 1M input tokens
  const outputCost = (outputTokens / 1_000_000) * 0.60; // $0.60 per 1M output tokens
  
  return inputCost + outputCost;
}
