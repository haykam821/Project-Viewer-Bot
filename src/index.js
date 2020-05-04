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
}

function link(text, url) {
	return `[${escape(text)}](${url})`;
}

client.command("projects", getProjects, async context => {
	context.replyWithMarkdown(context.state.projects.map(project => {
		const descriptionText = project.body ? " (" + escape(project.body) + ")" : "";
		return "• " + link(project.name, project.html_url) + descriptionText + ": `#" + project.number + "`";;
	}).join("\n"));
});

client.launch();