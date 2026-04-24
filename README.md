# BFHL Full Stack Engineering Challenge

An end-to-end full-stack application built to process directed graph edges, identify hierarchical relationships, detect cycles, and present structured tree data via a modern web interface.

## 🚀 Technologies Used

**Backend:**
- Node.js & Express.js
- REST API Design
- Advanced Graph Algorithms (DFS, Union-Find)

**Frontend:**
- Next.js (App Router)
- React
- Tailwind CSS
- Lucide React Icons

## 🧠 Core Processing Logic

The application implements a robust graph processor with the following rules:
1. **Validation**: Edges must be exactly `Single Uppercase Letter -> Single Uppercase Letter` (e.g., `A->B`). Self-loops (`A->A`) are invalid.
2. **Multi-parent Resolution**: In a directed tree, a child can only have one parent. The first assigned parent is preserved; subsequent conflicting edges are discarded.
3. **Cycle Detection**: Uses Depth-First Search (DFS) with a recursion stack. Cyclic components are flagged (`has_cycle: true`).
4. **Depth Calculation**: Valid non-cyclic trees calculate depth as the longest root-to-leaf path.
5. **Deduplication**: Duplicate identical edges are processed once and flagged for transparency.

## 📂 Project Structure

```text
bajaj-bfhl-fullstack/
├── backend/          # Express REST API & processing logic
└── frontend/         # Next.js web application
```

## 🛠️ How to Run

You will need two terminal windows to run both services simultaneously.

### 1. Start the API Server
```bash
cd backend
npm install
npm start
```
*API runs on `http://localhost:3000`*

### 2. Start the Web Interface
```bash
cd frontend
npm install
npm run dev -p 3001
```
*Web interface runs on `http://localhost:3001`*

## 📡 API Reference

### `POST /bfhl`
Processes directed edges.

**Request:**
```json
{
  "data": ["A->B", "A->C", "B->D", "B->C", "X->Y", "Y->X", "1->2"]
}
```

**Response:**
```json
{
  "user_id": "nabeelahmad_10102006",
  "email_id": "na3875@srmist.edu.in",
  "college_roll_number": "RA2311003011350",
  "hierarchies": [
    {
      "root": "A",
      "tree": {
        "A": {
          "B": {
            "D": {}
          },
          "C": {}
        }
      },
      "depth": 3
    },
    {
      "root": "X",
      "tree": {},
      "has_cycle": true
    }
  ],
  "invalid_entries": ["1->2"],
  "duplicate_edges": [],
  "summary": {
    "total_trees": 1,
    "total_cycles": 1,
    "largest_tree_root": "A"
  }
}
```
