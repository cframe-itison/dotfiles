---
name: reminders-workflow
description: User's personal Apple Reminders conventions — compound tag scheme for the Eisenhower matrix plus actionable/blocked status. Reference when creating, classifying, filtering, or reviewing reminders via RemCTL.
---

# Reminders Workflow

Apple Reminders is organized with two orthogonal tag axes plus a default landing list. Tags compose — a single task can carry one tag from each axis.

## Default landing list

All new tasks land in **Inbox** unless the user specifies otherwise.

## Tag scheme

### Eisenhower axis (priority)

- `#urgent` — time-sensitive
- `#important` — high-value

Quadrants are formed by combinations:

| Tags                       | Quadrant                  | Action    |
| -------------------------- | ------------------------- | --------- |
| `#urgent` + `#important`   | Urgent & Important        | Do        |
| `#urgent` only             | Urgent & Not Important    | Delegate  |
| `#important` only          | Not Urgent & Important    | Schedule  |
| neither                    | Not Urgent & Not Important| Eliminate |

### Status axis

- `#actionable` — ready to work on
- `#blocked` — waiting on something else

`#actionable` and `#blocked` are mutually exclusive — a task should never carry both.

## Behaviour

- New tasks are created untagged. Tagging happens later when the user sweeps the Inbox to triage.
- Do not infer tags from due dates or task content. Only set tags the user explicitly assigns or confirms.
- When filtering by quadrant, use tag combinations (e.g. Q1 = `#urgent` AND `#important`).
- Untagged tasks in Inbox are unclassified and waiting on the user to triage.
