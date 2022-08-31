function help() {
	return "help()\n" +
	"setRole(guildId, authorId, role)\n";
}

function setRole(guildId, authorId, role) {
	return new Promise((result, reject) => {
		global.functions.fetchAuthor(authorId).then(author => {
			if (author) {
				global.DBH.getUser({author: author, guildId: guildId}).then(user => {
					user.role = role;
					user.save();
					result(`Suucesfully setted "${role}" to "${user.name}" in "${guildId}"`);
				});
			} else {
				reject("Author is not found!");
			}
		});
	});
}

module.exports = { help, setRole };