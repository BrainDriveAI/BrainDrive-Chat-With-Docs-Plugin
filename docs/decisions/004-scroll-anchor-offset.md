# ADR-004: 420px Scroll Anchor Offset

**Status:** Accepted
**Date:** 2024 (during UI refactoring)
**Deciders:** BrainDrive Team
**Tags:** ux, ui, chat-interface, auto-scroll

---

## Context

Chat interface needs auto-scroll behavior:
- New messages appear → scroll to show them
- Streaming responses → scroll as content grows
- User manually scrolls up (reading history) → don't interrupt
- User at bottom → keep at bottom as new content arrives

**Problem discovered:**
- Standard `scrollToBottom()` hides last message below fold
- User sees bottom of viewport, not content
- Poor UX: last message cut off, requires manual scroll to read

**Requirements:**
- Keep last message fully visible
- Don't scroll if user reading history
- Smooth auto-scroll during streaming
- Prevent scroll fighting (user vs programmatic)

---

## Problem Statement

How much offset from bottom should auto-scroll target?

**Specific issues:**
1. `scrollToBottom()` → content hidden below fold
2. Too small offset → still cuts off content
3. Too large offset → doesn't feel "at bottom"
4. Variable message heights (1 line vs long code blocks)

**Goal:** Find sweet spot where:
- Last message fully visible
- Feels natural (user perceives "at bottom")
- Works for various message sizes

---

## Decision

**Chosen approach:** 420px offset from bottom

**Implementation (ChatScrollManager.ts):**
```typescript
const SCROLL_ANCHOR_OFFSET = 420; // px from bottom

scrollToAnchor(behavior: ScrollBehavior = 'smooth'): void {
  const scrollHeight = this.container.scrollHeight;
  const targetScroll = scrollHeight - this.container.clientHeight - SCROLL_ANCHOR_OFFSET;

  this.isProgrammaticScroll = true;
  this.container.scrollTo({
    top: Math.max(0, targetScroll),
    behavior
  });
  setTimeout(() => this.isProgrammaticScroll = false, 100);
}
```

**Rationale:**

**Why 420px specifically:**
1. **Min visible last message:** 64px (one-line message)
2. **Comfortable visible content:** ~350px (2-3 messages or code block)
3. **Total:** 64 + 350 ≈ 420px offset

**Visual breakdown:**
```
┌─────────────────────────┐
│  Scrollable content     │
│                         │
│  Message N-2            │
│  Message N-1            │  ← ~350px visible
│  Message N (latest)     │  ← ~64px minimum
├─────────────────────────┤  ← Scroll anchor (420px from bottom)
│                         │
│  (420px buffer)         │
│                         │
└─────────────────────────┘  ← Actual bottom
```

**Consequences:**
- Last message always fully visible
- User sees context (previous messages above)
- Feels "at bottom" without being at absolute bottom
- Works for both short and long messages

---

## Consequences

### Positive
- ✅ Last message never cut off
- ✅ Context visible (previous messages)
- ✅ Natural feel (doesn't look broken)
- ✅ Works with streaming (content grows, stays visible)
- ✅ Handles variable message heights

### Negative
- ❌ Not at absolute bottom (small whitespace below)
- ❌ Magic number (not dynamically calculated)
- ❌ May need adjustment if UI styling changes
- ❌ Doesn't adapt to screen size (420px fixed)

### Risks
- **Message taller than 420px:** Still partially cut off
  - Mitigation: Rare case (would need 400+px message), acceptable
- **Small screens:** 420px is large portion of viewport
  - Mitigation: Min height on chat container, responsive design
- **Styling changes:** Different message padding/margins
  - Mitigation: Document as tunable constant, revisit if UI changes

### Neutral
- Trade-off: Visible content vs feeling "at bottom"
- Could be made responsive (future enhancement)

---

## Alternatives Considered

### Alternative 1: Absolute scrollToBottom (0px offset)
**Description:** Scroll to absolute bottom (scrollTop = scrollHeight - clientHeight)

**Pros:**
- Simple implementation
- Truly "at bottom"
- No magic numbers

**Cons:**
- Last message cut off below fold (CRITICAL UX ISSUE)
- User can't see what was just sent
- Requires manual scroll to read response

**Why rejected:** Poor UX, defeats purpose of auto-scroll

### Alternative 2: Dynamic offset based on last message height
**Description:** Calculate offset from last message's actual height

**Pros:**
- Adapts to content
- Always shows exactly last message
- No magic number

**Cons:**
- More complex (DOM measurement)
- Performance cost (layout thrashing)
- Race condition during streaming (height changes)
- Doesn't show context (previous messages)

**Why rejected:** Over-engineered, doesn't show context

### Alternative 3: Scroll last message into view
**Description:** Use `element.scrollIntoView({ block: 'end' })`

**Pros:**
- Browser-native behavior
- Automatically handles variable heights
- No offset calculation needed

**Cons:**
- Less control over exact position
- Can jump awkwardly during streaming
- Doesn't guarantee context visibility

**Why rejected:** Less predictable, jumpy during streaming

### Alternative 4: Responsive offset (based on viewport height)
**Description:** Offset = 30% of viewport height (dynamic)

**Pros:**
- Adapts to screen size
- Proportional feel
- Works on mobile and desktop

**Cons:**
- More complex calculation
- May be too large on large screens
- May be too small on small screens
- Harder to reason about

**Why rejected:** Added complexity, 420px works well enough

---

## References

- src/domain/ui/ChatScrollManager.ts (implementation)
- src/collection-chat-view/CollectionChatViewShell.tsx (usage)
- Related: Data Quirk - Scroll state machine (isProgrammaticScroll)
- Related: UI_CONFIG.SCROLL_DEBOUNCE_DELAY (100ms)

---

## Implementation Notes

**File paths affected:**
- `src/domain/ui/ChatScrollManager.ts` - Main implementation
- `src/constants.ts` - Could extract SCROLL_ANCHOR_OFFSET here

**Configuration:**
```typescript
// ChatScrollManager.ts
const SCROLL_ANCHOR_OFFSET = 420; // px from bottom
const NEAR_BOTTOM_THRESHOLD = 100; // px threshold for "near bottom" detection
```

**State machine integration:**
```typescript
// Prevent infinite scroll loop
this.isProgrammaticScroll = true;
this.container.scrollTo({ top: targetScroll, behavior });
setTimeout(() => this.isProgrammaticScroll = false, 100);
```

**When to scroll to anchor:**
- New message received (user or AI)
- Streaming response chunk received
- User sends new message
- Conversation loaded (initial scroll)

**When NOT to scroll:**
- User manually scrolling (within grace period)
- User scrolled up to read history
- isNearBottom = false (user intentionally up)

**Critical gotchas:**
1. Must clear `isProgrammaticScroll` flag (100ms timeout)
2. Check `isNearBottom` before auto-scrolling
3. Grace period (300ms) prevents immediate re-scroll after user scroll
4. Debounce scroll events (100ms) to reduce handler calls

**Tuning guide:**
If last messages cut off:
- **Increase** SCROLL_ANCHOR_OFFSET (try 500px)

If too much whitespace below:
- **Decrease** SCROLL_ANCHOR_OFFSET (try 350px)

If scroll feels jumpy:
- Adjust SCROLL_DEBOUNCE_DELAY (try 150ms)

If scroll fights user:
- Increase grace period (try 500ms)

**Migration path:**
None - this was initial decision during UI extraction

**Rollback plan:**
Change to Alternative 3 (scrollIntoView) if offset proves problematic:
```typescript
lastMessageElement.scrollIntoView({
  behavior: 'smooth',
  block: 'end'
});
```
