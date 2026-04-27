# Root Node Creation Design

Date: 2026-04-27

## Goal

Users need a direct way to create a new root node from the Learning Map index page. The page currently lists existing root nodes but only lets users create the first one from Home. This makes the second and later learning trees feel impossible to start.

The product language should center on root nodes, not maps. The action should read as creating a new root node.

## Scope

This design has two phases:

1. Add a root-node creation entry point to `/maps` while keeping the current storage model.
2. Later remove the `Topic` model and let root nodes define learning trees directly.

Phase 1 is the implementation target. Phase 2 is a follow-up migration, not part of the first UI change.

## Phase 1: Create Root Node UI

The `/maps` page becomes both a root-node list and a root-node creation surface.

At the top of the page, below the title and short description, show a compact creation row:

- Text input placeholder: `What do you want to learn?`
- Primary button: `Create new root node`

When the user submits a non-empty value:

- Create a new learning root using the existing `Topic + root node` structure.
- Append the new topic and root node to the existing state.
- Set the new topic and root node as active.
- Navigate to the new learning map route.

When the input is empty:

- Do not create a node.
- Keep focus on the input.
- Avoid using a default topic such as `Transformer` on this page. Defaults are useful for demos, but this page is for real user-created roots.

The existing root-node cards stay below the creation row. The list remains scan-friendly and keeps the current card style.

## Empty State

When there are no root nodes, `/maps` should still show the same creation row instead of sending users back to Home. The empty state copy can be brief and secondary, for example:

`Create your first root node to start a learning tree.`

This makes `/maps` self-sufficient.

## Data Flow

Current state uses:

- `topics: Topic[]`
- `nodes: LearningNode[]`
- `activeTopicId: string`
- `activeNodeId: string`
- `node.topicId`

Phase 1 should add a domain helper that appends a new topic with a root node to an existing `AppState`, rather than duplicating creation logic in the React page.

Suggested helper:

```ts
createRootNode(state: AppState, title: string): AppState
```

Internally this can reuse `createTopicWithRoot(title, ...)`.

## Phase 2: Remove Topic

The current `Topic` model is redundant because a root node already has:

- A stable id.
- A title.
- A creation time.
- A child tree through `parentNodeId`.

The future model should treat each `LearningNode` with `parentNodeId === null` as a root node. The state can move toward:

```ts
nodes: LearningNode[]
activeRootNodeId: string
activeNodeId: string
```

Routes should eventually change from:

```txt
/maps/[topicId]
```

to:

```txt
/maps/[rootNodeId]
```

Tree rendering should then find all descendants of the selected root node instead of filtering by `topicId`.

This should be a separate migration because existing IndexedDB state may contain `topics`, `activeTopicId`, and `node.topicId`.

## Error Handling

For Phase 1:

- Trim whitespace before creation.
- Reject empty input.
- Keep the input editable during normal use.
- If the app state is unexpectedly null after rehydration, create a fresh state with the submitted root node.

## Testing

Add focused tests for:

- Creating a root node appends a second root without deleting existing nodes.
- `/maps` renders a creation input when roots already exist.
- `/maps` renders a creation input in the empty state.
- Submitting an empty input does not create a root.

If route navigation is hard to assert at the component-test level, verify the state change in unit tests and cover navigation with the existing e2e flow style.
