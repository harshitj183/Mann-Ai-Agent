# Tools Service

**Port:** `3006`
**Path:** `backend/tools-service/`
**Role:** AI Tools — web search, code execution, file ops (future)

---

## Current Status

> ⚠️ **Placeholder** — Abhi sirf health endpoint hai. Future milestones mein actual tools integrate honge.

---

## Folder Structure

```
tools-service/
├── src/
│   └── index.js    ← Server + health endpoint only
└── package.json
```

---

## Planned Tools (Future)

| Tool           | Kaam                                    |
|----------------|-----------------------------------------|
| web_search     | Internet se information dhundna         |
| run_code       | Python/JS code execute karna (sandbox)  |
| read_file      | File contents padhna                    |
| write_file     | File create/update karna                |
| send_email     | Email bhejha                            |
| fetch_url      | URL se data fetch karna                 |

---

## Dependencies

```json
{
  "express": "^4.21.0",
  "cors": "^2.8.5"
}
```
