const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  console.log("Payload", github.context.payload);
  try {
    const repo = github.context.payload.repository;
    const issueNumber = github.context.eventName === 'issues' ? github.context.payload.issue.number : github.context.payload.number;
    const user = github.context.payload.sender.login;

    // Input handling (multiple teams, whitespace trimming)
    const sponsorTeamSlugs = core.getInput('sponsor-team-slug', {
        required: true
      })
      .split(',')
      .map(slug => slug.trim());

    // Input handling (allowed labels, whitespace trimming)
    const allowedLabels = core.getInput('allowed-labels', {
        required: true
      })
      .split(',')
      .map(label => label.trim());

    // Get team members using GitHub's REST API 
    const octokit = github.getOctokit(core.getInput('github-token', {
      required: true
    }));
    let allTeamMembers = [];

    for (const teamSlug of sponsorTeamSlugs) {
      const {
        data: teamMembers
      } = await octokit.rest.teams.listMembersInOrg({
        org: repo.owner.login,
        team_slug: teamSlug
      });
      allTeamMembers = allTeamMembers.concat(teamMembers);
    }

    const action = github.context.payload.action;

    // Only apply to users from teams specified in `sponsor-team-slug`
    if (allTeamMembers.some((member) => member.login === user)) {

      // --- Issue Actions ---
      if (github.context.eventName === 'issues') { 

        // --- Label Handling ---
        if (github.context.eventName === 'issues' && (action === 'labeled' || action === 'unlabeled')) {
          const labelName = github.context.payload.label.name;
          if (!allowedLabels.includes(labelName)) {
            if (action === 'labeled') {
              await octokit.rest.issues.removeLabel({ owner: repo.owner.login, repo: repo.name, issue_number: issueNumber, name: labelName});
            } else if (action === 'unlabeled') {
              await octokit.rest.issues.addLabels({ owner: repo.owner.login, repo: repo.name, issue_number: issueNumber, labels: [labelName] });
            }

            // --- Output warning to sponsor ---
            await octokit.rest.issues.createComment({ owner: repo.owner.login, repo: repo.name, issue_number: issueNumber, body: `@${user} Sponsors can only use these labels: ${allowedLabels.join(', ')}.`});
          }
        }

      }

      // --- PRs & Issues Actions ---
      // --- Closing/Reopening/Assignment Handling ---
      if (action === 'closed' || action === 'reopened' || action === 'assigned') {
        if (action === 'closed') {
          await octokit.rest.issues.update({ owner: repo.owner.login, repo: repo.name, issue_number: issueNumber, state: 'open'});
        } else if (action === 'reopened') {
          await octokit.rest.issues.update({ owner: repo.owner.login, repo: repo.name, issue_number: issueNumber, state: 'closed'});
        } else if (action === 'assigned') {
          //Currently not working as expected. If I assign an issue to myself it will unassign me. But if I assign the issue to someone else it does not unassign that person from the issue.
          await octokit.rest.issues.removeAssignees({ owner: repo.owner.login, repo: repo.name, issue_number: issueNumber, assignees: [user] });
        }

        // --- Output warning to sponsor ---
        await octokit.rest.issues.createComment({ owner: repo.owner.login, repo: repo.name, issue_number: issueNumber, body: `@${user} Sponsors are not allowed to close, reopen, or assign issues or pull requests.`});
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run(); 
