const Telegraf = require("telegraf");
const commandParts = require("telegraf-command-parts");

const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
	auth: process.env.PROJECT_VIEWER_GITHUB_TOKEN,
});

const escape = require("markdown-escape");

const client = new Telegraf(process.env.PROJECT_VIEWER_TELEGRAM_TOKEN);
client.use(commandParts());

const getProjects = async (context, next) => {
	const user = await octokit.users.getAuthenticated();
	const projects = await octokit.projects.listForUser({
		username: user.data.login,
	});

	context.state.projects = projects.data;
	next();
};

const getProjectByNumber = (context, next) => {
	const number = context.state.command.splitArgs[0] || 1;
	if (number <= 0) {
		return context.reply("Project numbers must be positive.");
	}

	const project = context.state.projects[number - 1];
	if (!project) {
		return context.reply("There is no project with that number.");
	}

	context.state.project = project;
	next();
};

/**
 * Turns text and a URL into a link.
 * @param {string} text The text of the link.
 * @param {string} url The URL of the link.
 * @returns {string} The link.
 */
function link(text, url) {
	return `[${escape(text)}](${url})`;
}

client.command("projects", getProjects, context => {
	context.replyWithMarkdown(context.state.projects.map(project => {
		const descriptionText = project.body ? " (" + escape(project.body) + ")" : "";
		return "• " + link(project.name, project.html_url) + descriptionText + ": `#" + project.number + "`";
	}).join("\n"));
});

client.command("columns", getProjects, getProjectByNumber, async context => {
	const columns = await octokit.projects.listColumns({
		/* eslint-disable-next-line camelcase */
		project_id: context.state.project.id,
	});

	context.replyWithMarkdown(columns.data.map(column => {
		return "• " + link(column.name, column.url) + ": `" + column.id + "`";
	}).join("\n"));
});

client.launch();
