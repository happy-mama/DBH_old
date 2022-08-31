const mongoose = require("mongoose");
// guildModel
const guildSchema = new mongoose.Schema({
	id: String,
	name: String,
	prefix: String,
	private: Boolean
}, { versionKey: false });
const guildModel = mongoose.model("guilds", guildSchema);
//---
// userModel
const userSchema = new mongoose.Schema({
	id: String,
	guildId: String,
	name: String,
	role: String,
	bot: Boolean,
	private: Boolean,
	stats: {
		messages: 0,
		voiceTime: 0,
		commands: 0,
		interactions: 0
	}
}, { versionKey: false });
const userModel = mongoose.model("users", userSchema);
//---
// redirectUrlModel
const redirectUrlsSchema = new mongoose.Schema({
	id: String,
	url: String,
	message: String,
	redirected: Number
}, { versionKey: false });
const redirectUrlsModel = mongoose.model("redirectUrls", redirectUrlsSchema);
//---
//---[ WEB ]---
// WebUserModel
const WUserSchema = new mongoose.Schema({
	login: String,
	email: String,
	Password: String
}, { versionKey: false });
//---
// WebNotesModel
const WNotesSchema = new mongoose.Schema({
	userId: String,
	name: String,
	value: String
}, { versionKey: false })
const web = {
	WUserModel: new mongoose.model("WUsers", WUserSchema),
	WNotesModel: new mongoose.model("WNotes", WNotesSchema)
};

module.exports = { guildModel, userModel, redirectUrlsModel, web };