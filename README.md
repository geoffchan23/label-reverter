# repo-moderator

This GitHub Action empowers repositories to regulate sponsor team interactions with GitHub Issues, Pull Requests, and Discussions, ensuring optimal collaboration and workflow integrity.

**Key Features**

* **Label Enforcement:** Restricts sponsors to a designated set of labels on issues and pull requests.

> TBD whether these work
* **Issue/PR Control:** Prevents sponsors from closing, reopening, or assigning issues and pull requests.
* **Hidden Comment Protection:** Re-surfaces comments hidden by sponsors (with notification).
* **Discussion Restoration:** Recreates Discussions deleted by sponsors.
* **Discussion Category Guard:** Reverts discussion category changes made by sponsors.

**Prerequisites**

* A GitHub repository where you want to enforce sponsor restrictions.
* A GitHub Token with appropriate permissions (`repo` scope and potentially `admin:org` for managing team memberships). 

**Setup**

1. **Add Workflow:** Create a `.github/workflows/repo-moderator.yml` file in your repository. See the "Workflow Example" section below.
2. **Secrets:**  In your repository settings, add a secret named `REPO_MODERATOR_TOKEN`. Use your generated token value here. 

**Workflow Example**

```yaml
name: Repo Moderator

on:
  issues: 
    types: [labeled, unlabeled, closed, reopened, assigned] 
  pull_request:
    types: [closed, reopened, assigned]
  issue_comment:
    types: [created, edited, deleted]
  discussion_comment:
    types: [deleted]

jobs:
  revert-label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Revert Label Changes
        uses: geoffchan23/repo-moderator@main
        with:
          github-token: ${{ secrets.REPO_MODERATOR_TOKEN }}
          sponsor-team-slug: "team name, another team name"
          allowed-labels: "sponsor confirmed, sponsor disputed, sponsor acknowledged, disagree with severity"