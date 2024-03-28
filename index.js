const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const repo = github.context.payload.repository;
    const issueNumber = github.context.payload.issue.number;
    const addedLabel = github.context.payload.label.name;
    const user = github.context.payload.sender.login;
    
    // Input handling (multiple teams, whitespace trimming)
    const sponsorTeamSlugs = core.getInput('sponsor-team-slug', { required: true })
      .split(',')
      .map(slug => slug.trim()); 

    // Input handling (allowed labels, whitespace trimming)
    const allowedLabels = core.getInput('allowed-labels', { required: true })
      .split(',') 
      .map(label => label.trim()); 

    // Get team members using GitHub's REST API (iterate over slugs)
    const octokit = github.getOctokit(core.getInput('github-token', { required: true }));
    let allTeamMembers = [];

    for (const teamSlug of sponsorTeamSlugs) {
      const { data: teamMembers } = await octokit.rest.teams.listMembersInOrg({
        org: repo.owner.login,
        team_slug: teamSlug
      });
      allTeamMembers = allTeamMembers.concat(teamMembers);
    }

    // Check if the user who added the label is in the sponsor team
    if (allTeamMembers.some((member) => member.login === user)) {
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
