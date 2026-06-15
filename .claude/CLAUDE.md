# Shortcut stories

When referencing *another* Shortcut story from a story description, comment, or
PR body — i.e. a story other than the one being implemented — drop the `sc-`
prefix and write it as plain text, e.g. "follow-up story 20886 tracks…".

Why: Shortcut's VCS autolinker matches the bare `sc-<digits>` pattern anywhere
in PR titles/bodies/commits and *associates* every match. Our workspace's
"PR opened" event handler then assigns each associated story to the PR author
and moves it to In Review — which is wrong for stories that are only
referenced, not implemented. Dropping the `sc-` prefix avoids the match.

Keep the `sc-NNNNN` form (or the branch name) only for the story the PR
actually implements.
