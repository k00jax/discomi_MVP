# Batched Transcript Feature Design

## Goal
Post one complete Discord message per conversation instead of multiple real-time updates.

## Current Behavior (Transcript Processed)
- ✅ Trigger fires in real-time as user speaks
- ❌ Creates multiple messages per conversation
- ❌ No AI-generated summary/title/category

## Desired Behavior
- Post ONE message per conversation with complete transcript
- Trigger when:
  1. Recording stops / conversation ends
  2. User manually says "store memory" or similar command
  3. Session becomes inactive (timeout)

## Implementation Strategy

### Option 1: Session-based batching (RECOMMENDED)
Store transcript segments in memory/database keyed by session_id, then post when session ends.

**Pros:**
- Works with existing "Transcript Processed" trigger
- Can detect session end by timeout or explicit signal
- No changes to Omi configuration needed

**Cons:**
- Requires persistent storage (Supabase or Redis)
- Need to handle session cleanup/expiry
- More complex state management

### Option 2: Detect "final" segment
Look for signals in the payload that indicate recording stopped.

**Pros:**
- Simpler - no persistent storage needed
- Immediate posting when recording stops

**Cons:**
- Need to reverse-engineer how Omi signals "final" segment
- May miss some edge cases

### Option 3: Hybrid - Use both triggers
- Use "Transcript Processed" to accumulate segments
- Use "Conversation Creation" to post final message with AI summary

**Pros:**
- Best of both worlds - real-time accumulation + AI summary
- Clean separation of concerns

**Cons:**
- "Conversation Creation" trigger currently not working
- Double the webhook calls

## Recommended Implementation: Option 1

### Data Model
```typescript
// New table: transcript_sessions
{
  session_id: string (primary key)
  uid: string
  segments: Array<{text: string, timestamp: string}>
  created_at: timestamp
  updated_at: timestamp
  posted: boolean
}
```

### Flow
1. **Webhook receives "Transcript Processed" payload**
   - Extract session_id, uid, segment text
   - Check if session exists in transcript_sessions
   - If new: Create session record
   - If exists: Append segment to segments array
   - Update updated_at timestamp
   - Return 200 (don't post to Discord yet)

2. **Background job or timeout detection**
   - Find sessions where updated_at > 30 seconds ago AND posted = false
   - Combine all segments into one message
   - Post to Discord
   - Mark posted = true

3. **Manual trigger detection**
   - If segment.text contains "store memory" or similar phrases
   - Immediately post accumulated segments
   - Mark posted = true

### Environment Variables
```
TRANSCRIPT_BATCH_TIMEOUT=30  # seconds of inactivity before posting
TRANSCRIPT_BATCH_ENABLED=true  # toggle feature on/off
TRANSCRIPT_STORE_KEYWORDS="store memory,save this,remember this"  # comma-separated
```

### API Endpoints Needed
1. `POST /api/webhook` - Modified to handle batching
2. `POST /api/flush-session?session_id=X` - Manual flush for testing
3. `GET /api/session-status?session_id=X` - Check session state

### Edge Cases
1. **Very long conversations** - Limit combined text to Discord's 2000 char limit
2. **Abandoned sessions** - Cleanup sessions older than 24 hours
3. **Concurrent segments** - Handle race conditions with proper locking
4. **User stops before saying trigger phrase** - Rely on timeout

### Testing Plan
1. Record short conversation, wait for timeout → verify single message posted
2. Record and say "store memory" → verify immediate posting
3. Record very long conversation → verify text truncation
4. Start recording, abandon → verify cleanup after 24h
5. Multiple concurrent sessions → verify no cross-contamination

## Alternative: Simpler "Last Segment" Detection

If we want to avoid persistent storage:

### Look for indicators in payload:
- `is_final: true` flag
- `segments` array is longer (contains full conversation)
- Different endpoint or header for final segment
- Time gap between segments

### Implementation:
```typescript
// In webhook handler
if (isTranscriptProcessed) {
  // Check if this looks like the final segment
  const isFinalSegment = detectFinalSegment(body);
  
  if (!isFinalSegment) {
    // Ignore intermediate segments
    return res.status(200).send("ok_buffered");
  }
  
  // Post the complete transcript
  await postToDiscord(...);
}
```

This is simpler but less reliable. Would need testing to see if Omi provides any signals for "final" segment.

## Recommendation

**Start with the simpler "Last Segment" detection approach:**
1. Analyze the payload structure during recording vs after stopping
2. If we can reliably detect the final segment, use that
3. If not, fall back to session-based batching with Supabase

This minimizes complexity while achieving the desired UX.
