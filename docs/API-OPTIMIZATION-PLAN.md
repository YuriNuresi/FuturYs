# 🚀 FuturY API Optimization Plan
**Task:** card_503 - Optimize API calls and queries
**Priority:** Medium | **Story Points:** 3
**Date:** 2026-02-13

---

## 📊 Analysis Summary

After analyzing the API endpoints and database queries, I identified **5 major optimization opportunities**:

1. ✅ **Batch Resource Updates** (High Impact)
2. ✅ **Database Indexes** (High Impact)
3. ✅ **Query Optimization** (Medium Impact)
4. ✅ **Response Caching** (Medium Impact)
5. ✅ **API Response Size Reduction** (Low Impact)

---

## 🎯 Optimization 1: Batch Resource Updates

### Current Issue
`ResourceManager::consumeResources()` executes **N separate UPDATE queries** (one per resource):

```php
// BEFORE: Multiple UPDATE queries
foreach ($costs as $resource => $amount) {
    $result = $this->modifyResource($sessionId, $resource, -$amount);
    // Each call = 1 separate UPDATE query
}
```

This means consuming 3 resources = 3 separate database round-trips.

### Optimization
Implement a **single batched UPDATE query**:

```php
// AFTER: Single UPDATE query
UPDATE player_resources
SET budget = budget - :budget_cost,
    science_points = science_points - :science_cost,
    materials = materials - :materials_cost,
    last_updated = CURRENT_TIMESTAMP
WHERE session_id = :session_id
```

### Expected Impact
- **Query reduction:** 3-5 queries → 1 query per consume operation
- **Latency improvement:** ~50-70% faster for multi-resource operations
- **Database load:** Reduced connection overhead

---

## 🎯 Optimization 2: Database Indexes

### Current Issue
No explicit indexes on frequently queried columns.

### Optimization
Add indexes on:

```sql
-- High-frequency lookups
CREATE INDEX idx_player_resources_session ON player_resources(session_id);
CREATE INDEX idx_missions_session ON missions(session_id);
CREATE INDEX idx_missions_status ON missions(session_id, status);
CREATE INDEX idx_game_sessions_player ON game_sessions(player_id);

-- Composite index for common query patterns
CREATE INDEX idx_missions_session_status ON missions(session_id, status);
```

### Expected Impact
- **Query speed:** 10-100x faster for large datasets
- **SELECT queries:** O(n) → O(log n) lookup time
- **Critical for:** Sessions with 50+ missions

---

## 🎯 Optimization 3: Query Optimization

### Issue 3A: SaveManager - Multiple SELECT queries
`SaveManager::getGameState()` executes **4 separate SELECT** queries:

```php
// 4 separate queries
$session = $this->db->selectOne('SELECT * FROM game_sessions WHERE id = :id');
$resources = $this->db->selectOne('SELECT * FROM player_resources WHERE session_id = :id');
$missions = $this->db->select('SELECT * FROM missions WHERE session_id = :id');
$technologies = $this->db->select('SELECT * FROM player_technologies WHERE session_id = :id');
```

**Optimization:** Use prepared statement reuse and consider JOIN for related data.

### Issue 3B: ResourceManager - SELECT then UPDATE pattern
`updateResources()` does: SELECT → calculate → UPDATE

**Optimization:** Use database-level calculations where possible:

```sql
-- Instead of: fetch, calculate in PHP, update
UPDATE player_resources
SET budget = budget + (budget_production * :years_elapsed),
    science_points = science_points + (science_production * :years_elapsed)
WHERE session_id = :session_id
```

### Expected Impact
- **Reduced round-trips:** 50% fewer queries for time updates
- **Atomic operations:** Prevent race conditions

---

## 🎯 Optimization 4: Response Caching

### Current Issue
Static data (resource metadata, nation info) is fetched and formatted on every request.

### Optimization Strategy

1. **Static Data Caching**
   - Resource definitions (`ResourceManager::RESOURCES`) → Cache in client localStorage
   - Nation data → Cache with 1-hour TTL
   - Building definitions → Cache indefinitely (versioned)

2. **ETag Support**
   - Add `ETag` headers for GET endpoints
   - Return `304 Not Modified` when data unchanged

3. **API Response Headers**
   ```php
   header('Cache-Control: public, max-age=3600'); // 1 hour
   header('ETag: ' . md5(json_encode($data)));
   ```

### Expected Impact
- **Bandwidth reduction:** ~30-40% for repeated requests
- **Server load:** Reduced JSON encoding overhead
- **Client performance:** Faster page loads

---

## 🎯 Optimization 5: API Response Size Reduction

### Current Issue
`handleGetResources()` returns **enriched data with metadata** on every request:

```php
// 250+ bytes per resource
'resources' => [
    'budget' => [
        'value' => 1000000,
        'formatted' => '💰 1.00M Credits',
        'name' => 'Budget',
        'icon' => '💰',
        'color' => '#FFD700'
    ]
    // ... 7 more resources
]
```

### Optimization
Add **query parameter for compact mode**:

```php
// GET /api/resources.php?session_id=1&compact=true
// Returns only values (50 bytes instead of 250)
{
    "budget": 1000000,
    "science_points": 10000,
    ...
}
```

Client fetches metadata once, then uses compact responses for updates.

### Expected Impact
- **Response size:** ~80% smaller for resource updates
- **JSON parsing:** Faster client-side processing
- **Mobile performance:** Reduced data transfer

---

## 📈 Performance Benchmarks (Estimated)

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Consume 3 resources | 45ms | 15ms | **67% faster** |
| Get game state | 80ms | 35ms | **56% faster** |
| Resource update (time) | 60ms | 25ms | **58% faster** |
| Get missions (50 items) | 120ms | 20ms | **83% faster** |

---

## 🛠️ Implementation Plan

### Phase 1: Critical Optimizations (High Impact)
- [x] Add database indexes
- [x] Implement batch resource updates
- [x] Optimize SaveManager queries

### Phase 2: Caching Layer (Medium Impact)
- [x] Add response caching headers
- [x] Implement compact API responses
- [x] Add ETag support

### Phase 3: Monitoring (Low Priority)
- [ ] Add query timing logs
- [ ] Create performance dashboard
- [ ] Set up slow query alerts

---

## 🧪 Testing Strategy

1. **Unit Tests**
   - Test batch updates maintain data integrity
   - Verify cache invalidation works correctly

2. **Performance Tests**
   - Benchmark before/after with 100+ missions
   - Load test with concurrent requests

3. **Integration Tests**
   - Verify API responses unchanged (except performance)
   - Test backward compatibility

---

## 📝 Notes

- All optimizations maintain **backward compatibility**
- No breaking changes to existing API contracts
- Indexes creation is **safe on existing data**
- Caching is **opt-in** via query parameters

---

**Estimated Total Impact:**
- 🚀 **60-70% faster** average API response time
- 📉 **50% reduction** in database queries
- 💾 **40% smaller** network payloads (with compact mode)

