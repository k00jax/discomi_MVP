# AI-Enhanced Batched Transcripts Design

## Goal
Transform raw batched transcripts into intelligent, structured summaries with:
- Clean, readable summary (not raw transcript)
- Extracted tasks and action items
- Identified ideas and insights
- Context and relationships to previous conversations
- Smart categorization

## Architecture

### Option 1: Use OpenAI GPT (Recommended)
**Pros:**
- Excellent summarization
- Can understand context and relationships
- Reliable task/idea extraction
- JSON structured output

**Cons:**
- Requires OpenAI API key (~$0.01-0.05 per conversation)
- External dependency

### Option 2: Use Claude via Anthropic API
**Pros:**
- Great at analysis and reasoning
- Longer context window (good for relationships)
- JSON mode support

**Cons:**
- Requires API key
- Similar cost structure

### Option 3: Local/Open Source (Ollama, etc.)
**Pros:**
- No API costs
- Privacy

**Cons:**
- Need to self-host
- Less reliable quality

## Recommended Flow

```
1. User says "store memory"
2. Batch segments into raw transcript
3. Send to AI for processing:
   - Summarize into clean narrative
   - Extract tasks (with priorities)
   - Extract ideas/insights
   - Categorize (work, personal, meeting, etc.)
   - Relate to recent conversations
4. Store processed data in Supabase
5. Post enhanced message to Discord
```

## Discord Message Format (Enhanced)

```
💬 Meeting Discussion
A brief, coherent summary of the conversation in 2-3 sentences.

📋 Tasks Identified
• [High] Follow up with John about Q4 budget
• [Medium] Review design mockups by Friday
• [Low] Update team on project status

💡 Key Ideas
• Consider moving to microservices architecture
• Weekly standups might improve team communication

🏷️ Category: Work - Meeting
When: 2 minutes ago
Session • abc123
```

## Implementation Plan

### Phase 1: Basic AI Summarization
1. Add OpenAI integration
2. Send raw transcript to GPT-4
3. Get clean summary
4. Replace raw text with summary in Discord

### Phase 2: Structured Extraction
1. Use JSON mode to extract:
   - summary
   - tasks array
   - ideas array
   - category
   - sentiment
2. Format into rich Discord embed

### Phase 3: Context & Relationships
1. Store conversation embeddings
2. Vector search for related past conversations
3. Add "Related to" section in Discord
4. Build conversation threads/chains

### Phase 4: Smart Actions
1. Auto-create tasks in project management tools
2. Send reminders for high-priority tasks
3. Weekly digest of ideas
4. Trend analysis across conversations

## Data Model

```typescript
interface ProcessedTranscript {
  session_id: string;
  uid: string;
  raw_transcript: string;
  
  // AI-processed fields
  summary: string;
  tasks: Task[];
  ideas: string[];
  category: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  entities: Entity[];
  
  // Relationships
  related_sessions: string[];
  embedding_vector: number[];
  
  created_at: timestamp;
  processed_at: timestamp;
}

interface Task {
  text: string;
  priority: 'high' | 'medium' | 'low';
  due_date?: string;
  assignee?: string;
}

interface Entity {
  type: 'person' | 'organization' | 'location' | 'date';
  name: string;
  mentions: number;
}
```

## Environment Variables Needed

```env
# AI Processing
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini  # Cheaper, faster
AI_PROCESSING_ENABLED=true

# Features
EXTRACT_TASKS=true
EXTRACT_IDEAS=true
FIND_RELATIONSHIPS=true
MAX_RELATED_CONVERSATIONS=3

# Cost Controls
MAX_TOKENS_PER_SUMMARY=500
SKIP_AI_FOR_SHORT_TRANSCRIPTS=true  # Skip if < 50 words
```

## Prompt Engineering

### Summarization Prompt
```
You are summarizing a voice conversation transcript. 

Raw transcript:
{raw_text}

Provide a JSON response with:
{
  "summary": "2-3 sentence coherent summary",
  "tasks": [{"text": "task description", "priority": "high|medium|low"}],
  "ideas": ["key insight or idea"],
  "category": "work|personal|meeting|brainstorm|note",
  "sentiment": "positive|neutral|negative",
  "key_entities": ["person names", "companies", "dates mentioned"]
}

Rules:
- Summary should be narrative, not bullet points
- Tasks must be actionable (verbs: do, call, send, review, etc.)
- Ideas are insights, not facts
- Category based on content and tone
```

### Relationship Prompt (Phase 3)
```
Recent conversations:
{previous_summaries}

Current conversation:
{current_summary}

Are any of these conversations related? Return JSON:
{
  "related_ids": ["session_id_1", "session_id_2"],
  "relationship_type": "follow_up|continuation|related_topic",
  "explanation": "brief reason why they're related"
}
```

## Cost Estimate

Using GPT-4o-mini:
- Input: ~200 tokens (avg transcript)
- Output: ~150 tokens (summary + structured data)
- Cost: ~$0.005 per conversation
- $0.15 per token / 1M tokens input
- $0.60 per token / 1M tokens output

For 100 conversations/month: ~$0.50/month

## Next Steps

1. **Choose AI provider** (OpenAI recommended)
2. **Get API key**
3. **Implement basic summarization** (Phase 1)
4. **Test with real transcripts**
5. **Iterate on prompt engineering**
6. **Add structured extraction** (Phase 2)

Would you like me to implement Phase 1 (basic AI summarization)?
