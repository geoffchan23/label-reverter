# code4rena-repo-moderator (or your preferred action name)

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

1. **Add Workflow:** Create a `.github/workflows/sponsor-restrictions.yml` (or similar) file in your repository. See the "Workflow Example" section below.
2. **Secrets:**  In your repository settings, add a secret named `REPO_MODERATOR_TOKEN`. Use your generated token value here. 

**Workflow Example**

```yaml
name: Sponsor Restrictions Enforcement

on: 
  issues: 
    types: [labeled, unlabeled, closed, reopened, assigned] 
  pull_request:
    types: [closed, reopened, assigned]
  issue_comment: 
    types: [created, edited, deleted]  # For hidden comments
  discussion_deleted:  # Custom event triggered by a webhook
  discussion_category_changed: 

jobs:
  enforce-restrictions:
    runs-on: ubuntu-latest 
    steps:
      - uses: actions/checkout@v3
      - name: Enforce Sponsor Restrictions
        uses: your-org/code4rena-sponsor-control@main 
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }} 
          sponsor-team-slug: team-one, team-two  
          allowed-labels: sponsor confirmed, sponsor disputed, sponsor acknowledged 
