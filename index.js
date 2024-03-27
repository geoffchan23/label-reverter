const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const repo = github.context.payload.repository;
    const issueNumber = github.context.payload.issue.number;
    const addedLabel = github.context.payload.label.name;
    const user = github.context.payload.sender.login;
    const sponsorTeamSlug = core.getInput('sponsor-team-slug', { required: true });

    // Allowed labels for the sponsor team
    const allowedLabels = core.getInput('allowed-labels', { required: true }).split(','); 


    // Get team members using GitHub's REST API
    const octokit = github.getOctokit(core.getInput('github-token', { required: true }));
    const { data: teamMembers } = await octokit.rest.teams.listMembersInOrg({
      org: repo.owner.login,
      team_slug: sponsorTeamSlug
    });

    // Check if the user who added the label is in the sponsor team
    if (teamMembers.some((member) => member.login === user)) {
      // Check if the added label is within the allowed list
      if (!allowedLabels.includes(addedLabel)) { 
        // Remove the label if it's not allowed
        await octokit.rest.issues.removeLabel({
          owner: repo.owner.login,
          repo: repo.name,
          issue_number: issueNumber,
          name: addedLabel
        });

        // (Optional) Send a notification 
        await octokit.rest.issues.createComment({
          owner: repo.owner.login,
          repo: repo.name,
          issue_number: issueNumber,
          body: `@${user} Label changes by sponsor team members are restricted to the following labels: ${allowedLabels.join(', ')}. The label '${addedLabel}' has been removed.`
        });
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
