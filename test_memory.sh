#!/bin/bash
# Memory system integration test — Mann AI
# Tests all three memory tiers end-to-end

BASE="http://localhost:5000"
PASS=0
FAIL=0
WARN=0

ok()   { echo "  ✅ PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ FAIL: $1"; [ -n "$2" ] && echo "       response: $2"; FAIL=$((FAIL+1)); }
warn() { echo "  ⚠️  WARN: $1"; WARN=$((WARN+1)); }
hdr()  { echo ""; echo "── $1 ──────────────────────────────────────"; }

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║   MANN — Memory System Integration Tests      ║"
echo "╚═══════════════════════════════════════════════╝"

# ─── 1. Health Checks ────────────────────────────────────────────────────────
hdr "1. Health Checks"

for svc in "5000:api-gateway" "3002:chat-service" "3003:memory-service" "3004:agent-service"; do
  PORT="${svc%%:*}"; NAME="${svc##*:}"
  R=$(curl -sf --max-time 4 "http://localhost:${PORT}/health" 2>/dev/null)
  if echo "$R" | grep -q '"ok"'; then
    ok "$NAME (:$PORT)"
  else
    fail "$NAME (:$PORT)" "not responding"
  fi
done

# ─── 2. Auth ─────────────────────────────────────────────────────────────────
hdr "2. Auth — Signup"

EMAIL="mem_test_$(date +%s)@test.com"
SIGNUP=$(curl -sf --max-time 6 -X POST "$BASE/api/auth/signup" \
  -H "Content-Type: application/json" \
  -b /tmp/mann_test_cookies.txt -c /tmp/mann_test_cookies.txt \
  -d "{\"name\":\"TestUser\",\"email\":\"$EMAIL\",\"password\":\"testpass123\"}" 2>/dev/null)

USER_ID=$(echo "$SIGNUP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user',{}).get('id',''))" 2>/dev/null)
if [ -n "$USER_ID" ]; then
  ok "Signup → userId=$USER_ID"
else
  fail "Signup" "$SIGNUP"
  echo "  ⛔ Cannot continue without auth"
  rm -f /tmp/mann_test_cookies.txt
  exit 1
fi

# ─── 3. Conversation ─────────────────────────────────────────────────────────
hdr "3. Conversation (session memory container)"

CONV=$(curl -sf --max-time 5 -X POST "$BASE/api/chat/conversations" \
  -H "Content-Type: application/json" \
  -b /tmp/mann_test_cookies.txt -c /tmp/mann_test_cookies.txt \
  -d '{"title":"Memory Test Conv"}' 2>/dev/null)

CID=$(echo "$CONV" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('conversation',{}).get('id',''))" 2>/dev/null)
if [ -n "$CID" ]; then
  ok "Conversation created → id=$CID"
else
  fail "Create conversation" "$CONV"
  CID=""
fi

# ─── 4. Long-term Memory — direct memory-service ────────────────────────────
hdr "4. Long-term Memory (type=fact) — direct memory-service"

W1=$(curl -sf --max-time 5 -X POST "http://localhost:3003/memory/$USER_ID" \
  -H "Content-Type: application/json" \
  -d '{"key":"user_name","value":"Harshit","type":"fact"}' 2>/dev/null)
if echo "$W1" | grep -q '"key"'; then
  ok "Write fact: user_name=Harshit"
else
  fail "Write fact (type=fact)" "$W1"
fi

W2=$(curl -sf --max-time 5 -X POST "http://localhost:3003/memory/$USER_ID" \
  -H "Content-Type: application/json" \
  -d '{"key":"user_job","value":"Software Engineer","type":"fact"}' 2>/dev/null)
if echo "$W2" | grep -q '"key"'; then
  ok "Write fact: user_job=Software Engineer"
else
  fail "Write second fact" "$W2"
fi

R1=$(curl -sf --max-time 5 "http://localhost:3003/memory/$USER_ID" 2>/dev/null)
FC=$(echo "$R1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len([m for m in d.get('memories',[]) if m.get('type')=='fact']))" 2>/dev/null)
if [ "$FC" -ge 2 ] 2>/dev/null; then
  ok "Read back $FC facts"
  echo "$R1" | python3 -c "import sys,json; [print('    ',m['key'],':',m['value']) for m in json.load(sys.stdin).get('memories',[]) if m.get('type')=='fact']" 2>/dev/null
else
  fail "Read facts (expected ≥2)" "got FC=$FC"
fi

curl -sf --max-time 5 -X POST "http://localhost:3003/memory/$USER_ID" \
  -H "Content-Type: application/json" \
  -d '{"key":"user_name","value":"Harshit Kumar","type":"fact"}' > /dev/null 2>&1
R2=$(curl -sf --max-time 5 "http://localhost:3003/memory/$USER_ID" 2>/dev/null)
if echo "$R2" | grep -q "Harshit Kumar"; then
  ok "Upsert works — user_name overwritten to 'Harshit Kumar'"
else
  fail "Upsert (overwrite)" "$R2"
fi

curl -sf --max-time 5 -X DELETE "http://localhost:3003/memory/$USER_ID/user_job" > /dev/null 2>&1
R3=$(curl -sf --max-time 5 "http://localhost:3003/memory/$USER_ID" 2>/dev/null)
if ! echo "$R3" | grep -q '"user_job"'; then
  ok "Delete fact works"
else
  fail "Delete fact" "user_job still present"
fi

GM=$(curl -sf --max-time 5 "$BASE/api/memory" -b /tmp/mann_test_cookies.txt 2>/dev/null)
GC=$(echo "$GM" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('memories',[])))" 2>/dev/null)
if [ -n "$GC" ]; then
  ok "Gateway /api/memory returns $GC entries"
else
  fail "Gateway /api/memory" "$GM"
fi

# ─── 5. Session Memory — conversations table ────────────────────────────────
hdr "5. Session Memory — conversations.session_summary"

if [ -n "$CID" ]; then
  SESSION_JSON='{"motive":"Testing memory system","topics":["memory","testing","facts"],"outcome":"in progress"}'
  SESSION_STR=$(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$SESSION_JSON")

  SP=$(curl -sf --max-time 5 -X PATCH "http://localhost:3002/conversations/$USER_ID/$CID" \
    -H "Content-Type: application/json" \
    -d "{\"sessionSummary\": $SESSION_STR}" 2>/dev/null)
  if echo "$SP" | grep -q "updated"; then
    ok "Session summary saved to conversations row"
  else
    fail "Save session summary" "$SP"
  fi

  SG=$(curl -sf --max-time 5 "http://localhost:3002/conversations/$USER_ID/$CID/session" 2>/dev/null)
  MOT=$(echo "$SG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('session',{}).get('motive',''))" 2>/dev/null)
  if [ -n "$MOT" ]; then
    ok "Session read back — motive: \"$MOT\""
  else
    fail "Read session memory" "$SG"
  fi

  SGW=$(curl -sf --max-time 5 "$BASE/api/chat/conversations/$CID/session" \
    -b /tmp/mann_test_cookies.txt 2>/dev/null)
  if echo "$SGW" | grep -q '"motive"'; then
    ok "Gateway /api/chat/conversations/$CID/session works"
  else
    fail "Gateway session route" "$SGW"
  fi
else
  warn "Skipping session memory (no conversationId)"
fi

# ─── 6. Short-term Memory (messages) ────────────────────────────────────────
hdr "6. Short-term Memory — messages table"

if [ -n "$CID" ]; then
  curl -sf --max-time 5 -X POST "http://localhost:3002/messages/$USER_ID" \
    -H "Content-Type: application/json" \
    -d "{\"role\":\"user\",\"content\":\"Hello, my name is Harshit\",\"conversationId\":$CID}" > /dev/null 2>&1
  curl -sf --max-time 5 -X POST "http://localhost:3002/messages/$USER_ID" \
    -H "Content-Type: application/json" \
    -d "{\"role\":\"assistant\",\"content\":\"Hi Harshit! How can I help?\",\"conversationId\":$CID}" > /dev/null 2>&1

  MR=$(curl -sf --max-time 5 "http://localhost:3002/messages/$USER_ID/$CID?limit=10" 2>/dev/null)
  MC=$(echo "$MR" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('messages',[])))" 2>/dev/null)
  if [ "$MC" -ge 2 ] 2>/dev/null; then
    ok "$MC messages stored and retrieved"
  else
    fail "Short-term history" "got $MC messages"
  fi
else
  warn "Skipping (no conversationId)"
fi

# ─── 7. Full Agent Run — memory-agent extraction ─────────────────────────────
hdr "7. Full Agent Run — memory-agent + all tiers"

if [ -n "$CID" ]; then
  echo "  ⏳ Running agent (10-30s)..."
  AR=$(curl -sf --max-time 90 -X POST "$BASE/api/agents/runs" \
    -H "Content-Type: application/json" \
    -b /tmp/mann_test_cookies.txt \
    -d "{\"request\":\"My name is Harshit and I work as a software developer in Delhi. What is 5+7?\",\"conversationId\":$CID}" 2>/dev/null)

  ANS=$(echo "$AR" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('run',{}).get('output','')[:80])" 2>/dev/null)
  if [ -n "$ANS" ]; then
    ok "Agent run completed — \"$ANS\""
    sleep 3

    FR=$(curl -sf --max-time 5 "http://localhost:3003/memory/$USER_ID" 2>/dev/null)
    FN=$(echo "$FR" | python3 -c "import sys,json; print(len([m for m in json.load(sys.stdin).get('memories',[]) if m.get('type')=='fact']))" 2>/dev/null)
    if [ "$FN" -ge 1 ] 2>/dev/null; then
      ok "Memory-agent saved $FN fact(s)"
      echo "$FR" | python3 -c "
import sys,json
mems = [m for m in json.load(sys.stdin).get('memories',[]) if m.get('type')=='fact']
for m in mems: print(f'    {m[\"key\"]}: {m[\"value\"]}')
" 2>/dev/null
    else
      fail "Memory-agent facts" "0 facts found after run"
    fi

    SR=$(curl -sf --max-time 5 "http://localhost:3002/conversations/$USER_ID/$CID/session" 2>/dev/null)
    SM=$(echo "$SR" | python3 -c "import sys,json; d=json.load(sys.stdin); s=d.get('session'); print(s.get('motive','') if s else '')" 2>/dev/null)
    if [ -n "$SM" ]; then
      ok "Session memory updated — \"$SM\""
      SR_TOPICS=$(echo "$SR" | python3 -c "import sys,json; d=json.load(sys.stdin); s=d.get('session',{}); print(', '.join(s.get('topics',[])))" 2>/dev/null)
      echo "    Topics: $SR_TOPICS"
    else
      fail "Session memory after run" "$SR"
    fi

    echo ""
    echo "  ⏳ Run 2 — verifying memory recall..."
    AR2=$(curl -sf --max-time 90 -X POST "$BASE/api/agents/runs" \
      -H "Content-Type: application/json" \
      -b /tmp/mann_test_cookies.txt \
      -d "{\"request\":\"What is my name and where do I work?\",\"conversationId\":$CID}" 2>/dev/null)

    ANS2=$(echo "$AR2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('run',{}).get('output','')[:200])" 2>/dev/null)
    if echo "$ANS2" | grep -qi "harshit"; then
      ok "Memory recall works — agent remembered the name"
      echo "    Agent said: \"$ANS2\""
    else
      fail "Memory recall" "agent did not mention 'Harshit' — got: $ANS2"
    fi
  else
    fail "Agent run" "$(echo $AR | head -c 300)"
  fi
else
  warn "Skipping agent run (no conversationId)"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "╔═══════════════════════════════════════════════╗"
printf "║  Results: %2d passed | %2d failed | %2d warnings  ║\n" $PASS $FAIL $WARN
echo "╚═══════════════════════════════════════════════╝"
echo ""

rm -f /tmp/mann_test_cookies.txt
exit $FAIL
