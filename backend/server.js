const USER_ID = "nabeelahmad_10102006";
const EMAIL_ID = "na3875@srmist.edu.in";
const COLLEGE_ROLL_NUMBER = "RA2311003011350";

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/app", express.static(path.join(__dirname, "..", "frontend")));

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("BFHL API is running. Use POST /bfhl");
});

app.post("/bfhl", (req, res) => {
  try {
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

    const {
      childrenMap: treeChildrenMap,
      allNodes,
      childNodes,
    } = buildGraph(finalEdges);

    const components = getConnectedComponents(allNodes, finalEdges);

    const hierarchies = buildHierarchies(
      components,
      treeChildrenMap,
      childNodes,
      finalEdges
    );

    const summary = buildSummary(hierarchies);

    return res.json({
      user_id: USER_ID,
      email_id: EMAIL_ID,
      college_roll_number: COLLEGE_ROLL_NUMBER,
      hierarchies,
      invalid_entries: invalidEntries,
      duplicate_edges: duplicateEdges,
      summary,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

function trimInputs(data) {
  return data.map((item) => String(item).trim());
}

function validateEdge(str) {
  const match = str.match(/^([A-Z])->([A-Z])$/);
  if (!match) return false;
  return match[1] !== match[2];
}

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

  return {
    acceptedEdges,
    duplicateEdges: Array.from(duplicateEdgesSet),
  };
}

function resolveMultiParent(acceptedEdges) {
  const assignedParent = new Map();
  const finalEdges = [];

  for (const edge of acceptedEdges) {
    const [parent, child] = edge.split("->");

    if (!assignedParent.has(child)) {
      assignedParent.set(child, parent);
      finalEdges.push(edge);
    }
  }

  return finalEdges;
}

function buildGraph(finalEdges) {
  const childrenMap = new Map();
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

  for (const children of childrenMap.values()) {
    children.sort();
  }

  return { childrenMap, allNodes, childNodes };
}

function getConnectedComponents(allNodes, finalEdges) {
  const parent = new Map();
  const rank = new Map();

  for (const node of allNodes) {
    parent.set(node, node);
    rank.set(node, 0);
  }

  function find(x) {
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)));
    }
    return parent.get(x);
  }

  function union(a, b) {
    const rootA = find(a);
    const rootB = find(b);

    if (rootA === rootB) return;

    if (rank.get(rootA) < rank.get(rootB)) {
      parent.set(rootA, rootB);
    } else if (rank.get(rootA) > rank.get(rootB)) {
      parent.set(rootB, rootA);
    } else {
      parent.set(rootB, rootA);
      rank.set(rootA, rank.get(rootA) + 1);
    }
  }

  for (const edge of finalEdges) {
    const [a, b] = edge.split("->");
    union(a, b);
  }

  const groups = new Map();

  for (const node of allNodes) {
    const root = find(node);

    if (!groups.has(root)) {
      groups.set(root, new Set());
    }

    groups.get(root).add(node);
  }

  return Array.from(groups.values());
}

function selectRoot(componentNodes, childNodes) {
  const candidates = Array.from(componentNodes).filter(
    (node) => !childNodes.has(node)
  );

  if (candidates.length > 0) {
    candidates.sort();
    return candidates[0];
  }

  return Array.from(componentNodes).sort()[0];
}

function hasCycle(componentNodes, childrenMap) {
  const visited = new Set();
  const recursionStack = new Set();

  function dfs(node) {
    visited.add(node);
    recursionStack.add(node);

    const children = childrenMap.get(node) || [];

    for (const child of children) {
      if (!componentNodes.has(child)) continue;

      if (recursionStack.has(child)) {
        return true;
      }

      if (!visited.has(child) && dfs(child)) {
        return true;
      }
    }

    recursionStack.delete(node);
    return false;
  }

  for (const node of componentNodes) {
    if (!visited.has(node) && dfs(node)) {
      return true;
    }
  }

  return false;
}

function buildTree(node, childrenMap) {
  const children = childrenMap.get(node) || [];
  const subtree = {};

  for (const child of children) {
    subtree[child] = buildTree(child, childrenMap);
  }

  return subtree;
}

function calcDepth(node, childrenMap) {
  const children = childrenMap.get(node) || [];

  if (children.length === 0) {
    return 1;
  }

  return 1 + Math.max(...children.map((child) => calcDepth(child, childrenMap)));
}

function buildHierarchies(components, treeChildrenMap, childNodes, finalEdges) {
  const hierarchies = [];

  for (const component of components) {
    const root = selectRoot(component, childNodes);
    const scopedChildrenMap = new Map();

    for (const edge of finalEdges) {
      const [parent, child] = edge.split("->");

      if (component.has(parent) && component.has(child)) {
        if (!scopedChildrenMap.has(parent)) {
          scopedChildrenMap.set(parent, []);
        }

        scopedChildrenMap.get(parent).push(child);
      }
    }

    for (const children of scopedChildrenMap.values()) {
      children.sort();
    }

    const cyclic = hasCycle(component, scopedChildrenMap);

    if (cyclic) {
      hierarchies.push({
        root,
        tree: {},
        has_cycle: true,
      });
    } else {
      hierarchies.push({
        root,
        tree: {
          [root]: buildTree(root, treeChildrenMap),
        },
        depth: calcDepth(root, treeChildrenMap),
      });
    }
  }

  hierarchies.sort((a, b) => a.root.localeCompare(b.root));
  return hierarchies;
}

function buildSummary(hierarchies) {
  const total_trees = hierarchies.filter((h) => !h.has_cycle).length;
  const total_cycles = hierarchies.filter((h) => h.has_cycle).length;
  const nonCyclic = hierarchies.filter((h) => !h.has_cycle);

  let largest_tree_root = "";

  if (nonCyclic.length > 0) {
    nonCyclic.sort((a, b) => {
      if (b.depth !== a.depth) {
        return b.depth - a.depth;
      }

      return a.root.localeCompare(b.root);
    });

    largest_tree_root = nonCyclic[0].root;
  }

  return {
    total_trees,
    total_cycles,
    largest_tree_root,
  };
}

app.listen(PORT, () => {
  console.log(`BFHL backend running on http://localhost:${PORT}`);
});