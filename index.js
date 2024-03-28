const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const repo = github.context.payload.repository;
    const issueNumber = github.context.payload.issue.number;
    const user = github.context.payload.sender.login;

    // Input handling (multiple teams, whitespace trimming)
    const sponsorTeamSlugs = core.getInput('sponsor-team-slug', { required: true })
      .split(',')
      .map(slug => slug.trim()); 

    // Input handling (allowed labels, whitespace trimming)
    const allowedLabels = core.getInput('allowed-labels', { required: true })
      .split(',') 
      .map(label => label.trim()); 

    // Get team members using GitHub's REST API 
    const octokit = github.getOctokit(core.getInput('github-token', { required: true }));
    let allTeamMembers = [];

    for (const teamSlug of sponsorTeamSlugs) {
      const { data: teamMembers } = await octokit.rest.teams.listMembersInOrg({
        org: repo.owner.login,
        team_slug: teamSlug
      });
      allTeamMembers = allTeamMembers.concat(teamMembers);
    }

    // Handle both label additions and removals
    if (github.context.eventName === 'issues' && (github.context.payload.action === 'labeled' || github.context.payload.action === 'unlabeled')) { 
      const labelName = github.context.payload.label.name; 

      if (allTeamMembers.some((member) => member.login === user)) {
        // Check if label is within allowed labels (both for adding and removing)
        if (!allowedLabels.includes(labelName)) { 
          if (github.context.payload.action === 'labeled') {
            // Remove label if it's added and not allowed
            await octokit.rest.issues.removeLabel({
              owner: repo.owner.login,
              repo: repo.name,
              issue_number: issueNumber,
              name: labelName
            });
          } else if (github.context.payload.action === 'unlabeled') {
            // Re-add label if it's removed and not allowed to be removed
            await octokit.rest.issues.addLabels({
              owner: repo.owner.login,
              repo: repo.name,
              issue_number: issueNumber,
              labels: [labelName] 
            });
          }

         // (Optional) Send a notification - Modify as needed
          await octokit.rest.issues.createComment({
            owner: repo.owner.login,
            repo: repo.name,
            issue_number: issueNumber,
            body: `@${user} Label changes (additions and removals) by sponsor team members are restricted to the following labels: ${allowedLabels.join(', ')}.`
          });
        }
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
