# repo-moderator

This GitHub Action empowers repositories to regulate sponsor team interactions with GitHub Issues, Pull Requests, and Discussions, ensuring optimal collaboration and workflow integrity.

**Key Features**

* **Label Enforcement:** Restricts sponsors to a designated set of labels on issues and pull requests.
* **Issue/PR Control:** Prevents sponsors from closing, reopening, or assigning issues and pull requests.

**Prerequisites**

* A GitHub repository where you want to enforce sponsor restrictions.
* A GitHub Token with appropriate permissions (`repo` scope and potentially `admin:org` for managing team memberships). 

**Setup**

1. **Add Workflow:** Create a `.github/workflows/repo-moderator.yml` file in your repository, copy over the "Workflow Example" below, and edit the `sponsor-team-slug` to the name of sponsor team in GitHub.
2. **Secrets:**  This Action uses the default GitHub Action token `GITHUB_TOKEN`

**Workflow Example**

```yaml
name: Repo Moderator

on:
  issues: 
    types: [labeled, unlabeled, closed, reopened, assigned, unassigned] 
  pull_request:
    types: [closed, reopened, assigned, unassigned]

jobs:
  revert-action:
    if: github.actor != 'C4-Staff'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Revert Label Changes
        uses: geoffchan23/repo-moderator@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          sponsor-team-slug: "2024-04-sponsor-team-name"
          allowed-labels: "sponsor confirmed, sponsor disputed, sponsor acknowledged"