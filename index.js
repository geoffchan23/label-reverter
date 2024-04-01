const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  console.log("Payload", github.context.payload);
  try {
    const repo = github.context.payload.repository.name;
    const owner = github.context.payload.repository.owner.login;
    const issue_number = github.context.eventName === 'issues' ? github.context.payload.issue.number : github.context.payload.number;
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
        org: owner,
        team_slug: teamSlug
      });
      allTeamMembers = allTeamMembers.concat(teamMembers);
    }

    const action = github.context.payload.action;

    // Only apply to users from teams specified in `sponsor-team-slug`
    if (allTeamMembers.some((member) => member.login === user)) {

      // --- Label Handling ---
      if (github.context.eventName === 'issues' && (action === 'labeled' || action === 'unlabeled')) {
        const labelName = github.context.payload.label.name;
        
        if (!allowedLabels.includes(labelName)) {
          if (action === 'labeled') {
            await octokit.rest.issues.removeLabel({
              owner,
              repo,
              issue_number,
              name: labelName
            });
          } else if (action === 'unlabeled') {
            await octokit.rest.issues.addLabels({
              owner,
              repo,
              issue_number,
              labels: [labelName]
            });
          }

          // --- Output warning to sponsor ---
          await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number,
            body: `@${user} Sponsors can only use these labels: ${allowedLabels.join(', ')}.`
          });
        }
      } else {
        // --- Closing/Reopening/Assignment Handling ---
        const assignees = github.context.payload.assignee.login;
  
        if (action === 'closed') {
          await octokit.rest.issues.update({
            owner,
            repo,
            issue_number,
            state: 'open'
          });
        } else if (action === 'reopened') {
          await octokit.rest.issues.update({
            owner,
            repo,
            issue_number,
            state: 'closed'
          });
        } else if (action === 'assigned') {
          await octokit.rest.issues.removeAssignees({
            owner,
            repo,
            issue_number,
            assignees
          });
        } else if (action === 'unassigned') {
          await octokit.rest.issues.addAssignees({
            owner,
            repo,
            issue_number,
            assignees
          });
        }
  
        // --- Output warning to sponsor ---
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number,
          body: `@${user} Sponsors are not allowed to close, reopen, or assign issues or pull requests.`
        });
      }
    } // Only apply to users from teams specified in `sponsor-team-slug`
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
