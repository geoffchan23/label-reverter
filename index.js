const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const repo = github.context.payload.repository;
    const issueNumber = github.context.payload.issue.number;
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

    // Handle label changes, closing/reopening, assignments, hidden comments, discussion deletions/category changes
    if (github.context.eventName === 'issues' || github.context.eventName === 'pull_request' || github.context.eventName === 'comment_hidden' || github.context.eventName === 'discussion_deleted' || github.context.eventName === 'discussion_category_changed') { 

      const action = github.context.payload.action;

      if (allTeamMembers.some((member) => member.login === user)) {
        // --- Label Handling ---
        if (github.context.eventName === 'issues' && (action === 'labeled' || action === 'unlabeled')) {
          const labelName = github.context.payload.label.name;
          if (!allowedLabels.includes(labelName)) {
            if (action === 'labeled') {
              await octokit.rest.issues.removeLabel({ owner: repo.owner.login, repo: repo.name, issue_number: issueNumber, name: labelName});
            } else if (action === 'unlabeled') {
              await octokit.rest.issues.addLabels({ owner: repo.owner.login, repo: repo.name, issue_number: issueNumber, labels: [labelName] });
            }
            await octokit.rest.issues.createComment({ owner: repo.owner.login, repo: repo.name, issue_number: issueNumber, body: `@${user} Sponsors can only use these labels: ${allowedLabels.join(', ')}.`});
          }
        }

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
          await octokit.rest.issues.createComment({ owner: repo.owner.login, repo: repo.name, issue_number: issueNumber, body: `@${user} Sponsors are not allowed to close, reopen, or assign issues or pull requests.`});
        }

        // --- Hidden Comment Handling ---
        // Currently doesn't work. Could be hallucinated code as I don't see any reference to a comment_hidden event here https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#issue_comment
        if (github.context.eventName === 'comment_hidden') { 
          const hiddenCommentAuthor = github.context.payload.comment.user.login;

          if (allTeamMembers.some(member => member.login === hiddenCommentAuthor)) { 
            const { data: comments } = await octokit.rest.issues.listComments({ owner: repo.owner.login, repo: repo.name, issue_number: issueNumber});
            const hiddenComment = comments.find(comment => comment.user.login === hiddenCommentAuthor && !comment.body);

            if (hiddenComment) {
              await octokit.rest.issues.createComment({ owner: repo.owner.login, repo: repo.name, issue_number: issueNumber, body: `@${hiddenCommentAuthor} Sponsors are not allowed to hide comments. Original comment: ${hiddenComment.body}`});
            }
          }
        }

        // --- Discussion Deletion Handling ---
        // Needs testing that this works
        if (github.context.eventName === 'discussion_deleted') {
          const discussionTitle = github.context.payload.discussion.title; 
          const discussionBody = github.context.payload.discussion.body;
          const discussionCreator = github.context.payload.discussion.user.login; 

          if (allTeamMembers.some(member => member.login === discussionCreator)) { 
            await octokit.rest.discussions.createDiscussion({ owner: repo.owner.login, repo: repo.name, title: discussionTitle, body: discussionBody });
            // ... (notify moderators)
          }
        }

         // --- Discussion Category Change Handling ---
         // Needs testing that this works
        if (github.context.eventName === 'discussion_category_changed') {
          const discussionCategory = github.context.payload.changes.category.from; 
          const discussionCreator = github.context.payload.discussion.user.login;

          if (allTeamMembers.some(member => member.login === discussionCreator)) {
            await octokit.rest.discussions.updateDiscussion({ owner: repo.owner.login, repo: repo.name, discussion_number: github.context.payload.discussion.id, category_id: discussionCategory.id });
          }
        }
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run(); 
