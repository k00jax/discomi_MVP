# Session Management in DiscOmi

## How Sessions Work

### Session Creation
- Each user has ONE active session at a time
- Sessions are created automatically when transcripts arrive
- Session ID format: `{uid}_{timestamp}`

### Session Boundaries (Automatic)

Sessions automatically close and new ones are created when:

1. **Idle Timeout** (default: 60 minutes)
   - If no transcript segments for 60+ minutes, next segment creates new session
   - Old session is marked as "abandoned" (posted=true) but not sent to Discord
   - Prevents all-day accumulation

2. **Segment Limit** (default: 200 segments)
   - Safety limit to prevent runaway sessions
   - Automatically posts session when limit reached
   - Posts to Discord even without "store memory" keyword

3. **Manual Trigger** (user says "store memory")
   - Posts immediately with lookback window applied
   - Only includes segments from last 15 minutes OR last 100 segments (whichever is fewer)
   - Session marked as posted
   - Next segment creates new session

### Lookback Window Protection

When you say "store memory", the system doesn't blindly post everything in the session. Instead:

1. **Time Filter**: Only segments from last 15 minutes (configurable)
2. **Count Filter**: Only last 100 segments (configurable)
3. **Uses most restrictive**: Whichever filter results in fewer segments
4. **Minimum protection**: Always posts at least last 10 segments

This means:
- ✅ Forgot to say "store memory" all day? Only last 15 min gets posted
- ✅ Very short segments? Limited to 100 segments max
- ✅ Protection against accidentally posting hours of conversation
- ✅ Still captures complete recent context

### Example Scenarios

**Scenario 1: Normal Usage**
```
9:00 AM  - Start recording work meeting
9:30 AM  - Say "store memory" → Posts to Discord
11:00 AM - Start recording client call
11:45 AM - Say "store memory" → Posts to Discord
```
Result: Two separate Discord messages ✅

**Scenario 2: Forgot to Say "Store Memory"**
```
9:00 AM  - Start recording
10:30 AM - Stop recording (150 segments accumulated)
5:00 PM  - Start recording again (>60min idle)
5:30 PM  - Say "store memory"
```
Result: 
- 9:00-10:30 session abandoned (not posted)
- 5:00-5:30 session posted to Discord ✅

**Scenario 4: All-Day Recording (New with Lookback)**
```
9:00 AM  - Start recording, talk all day
5:00 PM  - Say "store memory" (8 hours of segments accumulated!)
```
Result:
- Lookback window filters to only last 15 minutes
- Posts ~4:45 PM - 5:00 PM conversation to Discord ✅
- Older segments discarded (protection against cost/token limits)

**Scenario 3: Very Long Recording**
```
9:00 AM  - Start recording
2:00 PM  - Still recording (hit 200 segment limit)
         - AUTO-POSTS to Discord
2:01 PM  - New session starts automatically
4:00 PM  - Say "store memory" → Posts second session
```
Result: Two Discord messages ✅

### Configuration

Adjust session behavior via environment variables:

```env
# Create new session after 60 minutes of silence (prevents all-day accumulation)
SESSION_IDLE_TIMEOUT_MINUTES=60

# Auto-post session after 200 segments (prevents token/cost overruns)
MAX_SEGMENTS_PER_SESSION=200

# Lookback window: only post segments from last N minutes
LOOKBACK_MINUTES=15

# Lookback segment limit: only post last N segments
LOOKBACK_SEGMENTS=100
```

### Recommendations

**Short timeout** (30-45 min): Better for users who forget to say "store memory"
- Pros: Natural conversation boundaries, prevents massive sessions
- Cons: May split longer meetings into multiple posts

**Long timeout** (90-120 min): Better for users who consistently say "store memory"
- Pros: Keeps long meetings together if user triggers manually
- Cons: Risk of abandoned sessions accumulating many segments

**Default (60 min)**: Good balance for most users

### Monitoring

Check Vercel logs for session activity:
```
[Batching] Reusing active session W7xTEw3Yjde3XSbUyS0ZSNlcb852_1729123456789
[Batching] Session W7xTEw3Yjde3XSbUyS0ZSNlcb852_1729123456789 idle for >60min, creating new session
[Batching] Session hit max segments (200), auto-posting
```
