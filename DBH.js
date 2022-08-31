/*
.___  ___     _   _   ,   __  _ ____  _    ____ ____
| _ \| _ \   | |_| | / \ |  \| |  _ \| |  | ___| __ \
||_| | _ <   |  _  |/ _ \| . ' | |_| | |__| ___|    /
|___/|___/   |_| |_|_/ \_|_|\__|____/|____|____|_|\_\

MongoDB + mongoose  :  0.4.1a
*/

const JWT = require("jsonwebtoken");
const mongoose = require("mongoose");
/** class representing a DBH */
class DBH {
	/**
	 * Create an instance of DataBase Handler
	 * @author happy-mama
	 * @version 0.4.1a
	 */
	constructor() {
		this.cache = {
			users: new Map(),
			guilds: new Map(),
			voice: new Map(),
			redirectUrls: new Map(),
			web: {
				users: new Map(),
				jwt: new Map(),
				notes: new Map()
			}
		},
		this.schemas = null;
		this.properties = null;
		this.adminTools = null;
		this.defaultPrefix = null;
		this.JWTS = null;
	}

	// @param {{user: string, password: string, host: string, database: string}} config

	/**
	 * Initiates a connection to MongoDB
	 * @param {object} config an Object
	 * @param {string} config.user account login
	 * @param {string} config.password account password
	 * @param {string} config.host DB ip
	 * @param {string} config.database name of DB
	 * @return {Promise<void>} `void`
	 */
	init(config) {
		return new Promise((result, reject) => {
			mongoose.connect(`mongodb://${config.user}:${config.password}@${config.host}/${config.database}?retryWrites=true`).then(() => {
				this.properties = require("./collections/properties");
				this.schemas = require("./collections/schemas.js");
				this.adminTools = require("./adminTools.js");
				this.defaultPrefix = config.prefix;
				this.JWTS = config.JWTS;
				console.log("[DB]: CONNECTED");
				result();
				setInterval(() => {
					this.cacheSave();
				}, 1000 * 60 * 10);
			}).catch(e => { reject(e); });
		});
	}

	/**
	 * Get an `User` from `DB`
	 * @param {object} opts
	 * @param {{ id: string, username: string, bot: boolean }} opts.author
	 * @param {string} opts.guildId 
	 * @returns {Promise<object>} `User` Object
	 */
	getUser({ author, guildId } = { author: {}, guildId: "" }) {
		return new Promise((result, reject) => {
			this.cacheUser({ authorId: author.id, guildId: guildId }).then(user => {
				if (user.name != author.username) {
					user.name = author.username;
				}
				result(user);
			}).catch(e => {
				if (e == "ENOUSER") {
					this.createUser({ author: author, guildId: guildId }).then(user => {
						result(user);
					});
				} else {
					reject(e);
				}
			});
		});
	}

	/**
	 * Get an `User` from `Cache`
	 * @param {object} opts
	 * @param {string} opts.authorId
	 * @param {string} opts.guildId
	 * @returns {Promise<object>} `User` Object
	 */
	cacheUser({ authorId, guildId } = { authorId: "", guildId: "" }) {
		return new Promise((result, reject) => {
			let user = this.cache.users.get(guildId + ":" + authorId);
			if (user) {
				result(user);
			} else {
				this.schemas.userModel.findOne({ id: authorId, guildId: guildId }).then(user => {
					if (user) {
						result(user);
						this.cache.users.set(guildId + ":" + authorId, user);
					} else {
						reject("ENOUSER");
					}
				});
			}
		});
	}

	/**
	 * Create an `User` to `DB`
	 * @param {object} opts
	 * @param {{ id: string, username: string, bot: boolean }} opts.author
	 * @param {String} opts.guildId
	 * @returns {Promise<object>} `User` Object
	 */
	createUser({ author, guildId } = { author: {}, guildId: "" }) {
		return new Promise((result) => {
			let user = new this.schemas.userModel({
				id: author.id,
				guildId: guildId,
				name: author.username,
				role: "user",
				bot: author.bot ? true : false,
				stats: {
					messages: 0,
					voiceTime: 0,
					commands: 0,
					interactions: 0,
				}
			});
			this.cache.users.set(guildId + ":" + author.id, user);
			result(user);
		});
	}

	/**
	 * Get an `Guild` from `DB`
	 * @param {object} opts
	 * @param {{id: string, name: string}} opts.guild
	 * @returns {Promise<object>} `Guild` Object
	 */
	getGuild({ guild } = { guild: {} }) {
		return new Promise((result, reject) => {
			this.cacheGuild({ guildId: guild.id }).then(_guild => {
				if (_guild.name != guild.name) {
					_guild.name = guild.name;
				}
				result(_guild);
			}).catch(e => {
				if (e == "ENOGUILD") {
					this.createGuild({ guild: guild }).then(guild => {
						result(guild);
					});
				} else {
					reject(e);
				}
			});
		});
	}

	/**
	 * Get a `Guild` from `DB`
	 * @param {object} opts
	 * @param {string} opts.guildId 
	 * @returns {Promise<object>} `Guild` Object
	 */
	cacheGuild({ guildId } = { guildId: "" }) {
		return new Promise((result, reject) => {
			let guild = this.cache.guilds.get(guildId);
			if (guild) {
				result(guild);
			} else {
				this.schemas.guildModel.findOne({ id: guildId }).then(guild => {
					if (guild) {
						result(guild);
						this.cache.guilds.set(guildId, guild);
					} else {
						reject("ENOGUILD");
					}
				});
			}
		});
	}

	/**
	 * Create a `Guild` to `DB`
	 * @param {object} opts
	 * @param {{id: string, name: string}} opts.guild
	 * @returns {Promise<object>} `Guild` Object
	 */
	createGuild({ guild } = { guild: {} }) {
		return new Promise((result) => {
			let _guild = new this.schemas.guildModel({
				id: guild.id,
				name: guild.name,
				prefix: this.defaultPrefix,
				private: false
			});
			this.cache.guilds.set(guild.id, _guild);
			result(_guild);
		});
	}

	/**
	 * Get a `RedirectUrl` from DB
	 * @param {object} opts
	 * @param {string} opts.id 
	 * @returns {Promise<object>} `RedirectUrl` Object
	 */
	getRedirectUrl({ id } = { id: "" }) {
		return new Promise((result, reject) => {
			let RUrl = this.cache.redirectUrls.get(id);
			if (RUrl) { result(RUrl); }
			this.schemas.redirectUrlsModel.findOne({ id:id }).then(redirectUrl => {
				if (redirectUrl) {
					this.cache.redirectUrls.set(id, redirectUrl);
					result(redirectUrl);
				} else {
					reject("ENOURL");
				}
			});
		});
	}

	/**
	 * Create a `RedirectUrl` to `DB`
	 * @param {object} opts
	 * @param {string} opts.id
	 * @param {string} opts.mesasge 
	 * @returns {Promise<object>} `RedirectUrl` Object
	 */
	createRedirectUrl({ id, mesasge } = {id: "", mesasge: ""}) {
		return new Promise((result) => {
			let RUrl = new this.schemas.redirectUrlsModel ({
				id: id,
				message: mesasge,
				redirectUrls: 0
			});
			this.cache.redirectUrls.set(id, RUrl);
			result(RUrl);
		});
	}

	// WEB AUTH

	web = {
		/**
		 * Get `JWT` Object from `JWT` string
		 * @param {object} opts
		 * @param {string} opts.jwt 
		 * @returns {Promise<object>} `JWT` Object
		 */
		JWTVerify({jwt} = {jwt: ""}) {
			return new Promise((result, rejeсt) => {
				let decoded = this.cache.web.jwt.get(jwt);
				if (decoded) {
					result(decoded);
				} else {
					JWT.verify(jwt, this.JWTS, (err, decoded) => {
						if (err) {
							if (err.name = "TokenExpiredError") { rejeсt("EJWTEXPIRED") }
							else { rejeсt(err.name); }
						}
						this.cache.web.jwt.set(jwt, decoded);
						result(decoded);
					})
				}
			});
		},

		/**
		 * Create `JWT` string
		 * @param {object} opts
		 * @param {string} opts._id
		 * @param {string} opts.login
		 * @param {string} opts.password
		 * @param {string} opts.email
		 * @returns {Promise<string>} `JWT` String
		 */
		JWTCreate({_id, login, password, email} = {_id: "", login: "", password: "", email: ""}) {
			return new Promise((result) => {
				let coded = JWT.sign({
					_id: _id,
					log: login,
					pas: password,
					ema: email
				}, this.JWTS, {
					expiresIn: 1000 * 60 * 60 * 24 * 7
				});
				this.cache.web.jwt.set(coded, {_id: _id, log: login, pas: password, ema: email});
				result(coded);
			})
		},

		/**
		 * Get `User` from `DB` via `JWT` or `Auth` params
		 * @param {object} opts 
		 * @param {string | null} opts.jwt
		 * @param {{id: string, login: string, password: string, email: string} | null} opts.auth
		 * @returns {Promise<object>} `User` Object
		 */
		getUser({jwt, auth} = {user: Object}) {
			return new Promise((result, reject) => {
				if (jwt) { // auth via JWT
					this.JWTVerify({jwt: jwt}).then(decoded => {
						this.schemas.web.WUserModel.findOne({
							id: decoded.id,
							login: decoded.log,
							password: decoded.pas,
							email: decoded.ema
						})
					}).catch(err => {

					})
				} else { // auth via login, password

				}


				this.web.cacheUser({mailORlogin: mailORlogin, password: password}).then(_user => {
					
				}).catch(e => {

				});
			})
		},
		cacheUser({mailORlogin, password} = {mailORlogin: "", password: ""}) {
			return new Promise((result, reject) => {
				this.cache.web.users.get()
			});
		},
		createUser({mail, login, password} = {mail: "", login: "", password: ""}) {
			return new Promise((result, reject) => {

			});
		}
	}

	// cacheVoice(user, state) {
	// 	return new Promise((result) => {
	// 		let voice = this.cache.voice.get(user.id);
	// 		if (!voice) {
	// 			voice = {
	// 				id: user.id,
	// 				start: Math.floor(new Date / 1000),
	// 				end: 0
	// 			};
	// 			this.cache.voice.set(user.id, voice);
	// 			result();
	// 		} else {
	// 			if (state.action == "leave") {
	// 				voice.end = Math.floor(new Date / 1000);
	// 				user.stats.voiceTime += voice.end - voice.start;
	// 				this.cache.voice.delete(user.id);
	// 				result();
	// 			}
	// 		}
	// 	});
	// }

	/**
	 * Saves and clearing all DBH cache
	 * @returns {void}
	 */
	cacheSave() {
		this.cache.users.forEach(user => { user.save(); });
		this.cache.users.clear();

		this.cache.guilds.forEach(guild => { guild.save(); });
		this.cache.guilds.clear();

		this.cache.redirectUrls.clear();
		return "Success";
	}

	/**
	 * Get `Role` Object
	 * @param {string} role 
	 * @returns {object} role
	 */
	getRole(role) {
		return this.properties.roles.get(role);
	}
}

module.exports = new DBH();