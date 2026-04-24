const USER_ID = "REPLACE_WITH_FULLNAME_DDMMYYYY";
const EMAIL_ID = "REPLACE_WITH_COLLEGE_EMAIL";
const COLLEGE_ROLL_NUMBER = "REPLACE_WITH_ROLL_NUMBER";

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend static files at /app
app.use("/app", express.static(path.join(__dirname, "..", "frontend")));

const PORT = process.env.PORT || 3000;

// ─── Route 1: GET / ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("BFHL API is running. Use POST /bfhl");
});

// ─── Route 2: POST /bfhl ────────────────────────────────────────
app.post("/bfhl", (req, res) => {
  const { data } = req.body;

  if (!data || !Array.isArray(data)) {
    return res.status(400).json({
      error: "Invalid request. data must be an array.",
    });
  }

  const trimmed = trimInputs(data);
  const { validEdges, invalidEntries } = separateValidAndInvalid(trimmed);
  const { acceptedEdges, duplicateEdges } = deduplicateEdges(validEdges);
  const finalEdges = resolveMultiParent(acceptedEdges);

  // Use finalEdges for component grouping and tree building
  const { childrenMap: treeChildrenMap, allNodes, childNodes } = buildGraph(finalEdges);
  const components = getConnectedComponents(allNodes, finalEdges);

  // Pass acceptedEdges so cycle detection can use pre-multi-parent edges
  const hierarchies = buildHierarchies(components, treeChildrenMap, childNodes, acceptedEdges);
  const summary = buildSummary(hierarchies);

  res.json({
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: COLLEGE_ROLL_NUMBER,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary,
  });
});

// ─── Processing Functions ────────────────────────────────────────

/** Convert every element to string and trim whitespace from both ends. */
function trimInputs(data) {
  return data.map((item) => String(item).trim());
}

/** Returns true only if str matches "X->Y" where X,Y are single distinct uppercase letters. */
function validateEdge(str) {
  const match = str.match(/^([A-Z])->([A-Z])$/);
  if (!match) return false;
  // Self-loop is invalid
  return match[1] !== match[2];
}

/** Separate trimmed items into valid edges and invalid entries. */
function separateValidAndInvalid(trimmedItems) {
  const validEdges = [];
  const invalidEntries = [];

  for (const item of trimmedItems) {
    if (validateEdge(item)) {
      validEdges.push(item);
    } else {
      invalidEntries.push(item);
    }
  }

  return { validEdges, invalidEntries };
}

/** Remove duplicate edges. First occurrence is kept; later ones tracked once in duplicateEdges. */
function deduplicateEdges(validEdges) {
  const seen = new Set();
  const acceptedEdges = [];
  const duplicateEdgesSet = new Set();

  for (const edge of validEdges) {
    if (seen.has(edge)) {
      duplicateEdgesSet.add(edge);
    } else {
      seen.add(edge);
      acceptedEdges.push(edge);
    }
  }

  return { acceptedEdges, duplicateEdges: [...duplicateEdgesSet] };
}

/** First parent wins for each child node. Later parents are silently discarded. */
function resolveMultiParent(acceptedEdges) {
  const assignedParent = new Map(); // child → parent
  const finalEdges = [];

  for (const edge of acceptedEdges) {
    const [parent, child] = edge.split("->");
    if (!assignedParent.has(child)) {
      assignedParent.set(child, parent);
      finalEdges.push(edge);
    }
    // Silently discard if child already has a parent
  }

  return finalEdges;
}

/** Build adjacency structures from final edges. */
function buildGraph(finalEdges) {
  const childrenMap = new Map(); // parent → [children]
  const allNodes = new Set();
  const childNodes = new Set();

  for (const edge of finalEdges) {
    const [parent, child] = edge.split("->");
    allNodes.add(parent);
    allNodes.add(child);
    childNodes.add(child);

    if (!childrenMap.has(parent)) {
      childrenMap.set(parent, []);
    }
    childrenMap.get(parent).push(child);
  }

  // Sort each parent's children lexicographically
  for (const [, children] of childrenMap) {
    children.sort();
  }

  return { childrenMap, allNodes, childNodes };
}

/** Group all nodes into connected components using Union-Find (undirected). */
function getConnectedComponents(allNodes, finalEdges) {
  const parent = new Map();
  const rank = new Map();

  function find(x) {
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)));
    }
    return parent.get(x);
  }

  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    if (rank.get(ra) < rank.get(rb)) {
      parent.set(ra, rb);
    } else if (rank.get(ra) > rank.get(rb)) {
      parent.set(rb, ra);
    } else {
      parent.set(rb, ra);
      rank.set(ra, rank.get(ra) + 1);
    }
  }

  for (const node of allNodes) {
    parent.set(node, node);
    rank.set(node, 0);
  }

  for (const edge of finalEdges) {
    const [a, b] = edge.split("->");
    union(a, b);
  }

  // Group nodes by their root representative
  const groups = new Map();
  for (const node of allNodes) {
    const root = find(node);
    if (!groups.has(root)) {
      groups.set(root, new Set());
    }
    groups.get(root).add(node);
  }

  return [...groups.values()];
}

/** Pick the root for a component: lex-smallest non-child, or lex-smallest overall if pure cycle. */
function selectRoot(componentNodes, childNodes) {
  const candidates = [...componentNodes].filter((n) => !childNodes.has(n));
  if (candidates.length > 0) {
    candidates.sort();
    return candidates[0];
  }
  // Pure cycle — all nodes are children
  const sorted = [...componentNodes].sort();
  return sorted[0];
}

/** Detect a cycle within a component using DFS with a recursion stack. */
function hasCycle(componentNodes, childrenMap) {
  const visited = new Set();
  const recursionStack = new Set();

  function dfs(node) {
    visited.add(node);
    recursionStack.add(node);

    const children = childrenMap.get(node) || [];
    for (const child of children) {
      // Only traverse within this component
      if (!componentNodes.has(child)) continue;
      if (recursionStack.has(child)) return true;
      if (!visited.has(child)) {
        if (dfs(child)) return true;
      }
    }

    recursionStack.delete(node);
    return false;
  }

  for (const node of componentNodes) {
    if (!visited.has(node)) {
      if (dfs(node)) return true;
    }
  }

  return false;
}

/** Recursively build a tree object. Root key wraps children. */
function buildTree(node, childrenMap) {
  const children = childrenMap.get(node) || [];
  const childObj = {};

  for (const child of children) {
    // children are already sorted in buildGraph
    const subtree = buildTree(child, childrenMap);
    childObj[child] = subtree[child] !== undefined ? subtree[child] : {};
  }

  return { [node]: childObj };
}

/** Calculate depth: count of nodes on the longest root-to-leaf path. */
function calcDepth(node, childrenMap) {
  const children = childrenMap.get(node) || [];
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map((c) => calcDepth(c, childrenMap)));
}

/** Build hierarchy objects for every connected component. */
function buildHierarchies(components, treeChildrenMap, childNodes, acceptedEdges) {
  const hierarchies = [];

  for (const component of components) {
    const root = selectRoot(component, childNodes);

    // Build a scoped adjacency from acceptedEdges (pre-multi-parent)
    // restricted to nodes in this component, for cycle detection
    const scopedChildrenMap = new Map();
    for (const edge of acceptedEdges) {
      const [parent, child] = edge.split("->");
      if (component.has(parent) && component.has(child)) {
        if (!scopedChildrenMap.has(parent)) scopedChildrenMap.set(parent, []);
        scopedChildrenMap.get(parent).push(child);
      }
    }

    const cyclic = hasCycle(component, scopedChildrenMap);

    if (cyclic) {
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      // Build tree using the post-multi-parent graph
      const treeObj = buildTree(root, treeChildrenMap);
      const depth = calcDepth(root, treeChildrenMap);
      hierarchies.push({ root, tree: treeObj, depth });
    }
  }

  // Sort by root lexicographically
  hierarchies.sort((a, b) => a.root.localeCompare(b.root));
  return hierarchies;
}

/** Compute summary statistics from the hierarchies array. */
function buildSummary(hierarchies) {
  const total_trees = hierarchies.filter((h) => !h.has_cycle).length;
  const total_cycles = hierarchies.filter((h) => h.has_cycle).length;

  const nonCyclic = hierarchies.filter((h) => !h.has_cycle);

  let largest_tree_root = "";
  if (nonCyclic.length > 0) {
    // Sort by depth descending, then root ascending as tiebreaker
    nonCyclic.sort((a, b) => {
      if (b.depth !== a.depth) return b.depth - a.depth;
      return a.root.localeCompare(b.root);
    });
    largest_tree_root = nonCyclic[0].root;
  }

  return { total_trees, total_cycles, largest_tree_root };
}

// ─── Start Server ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`BFHL backend running on http://localhost:${PORT}`);
});
