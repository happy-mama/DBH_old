/*
.___  ___     _   _   ,   __  _ ____  _    ____ ____
| _ \| _ \   | |_| | / \ |  \| |  _ \| |  | ___| __ \
||_| | _ <   |  _  |/ _ \| . ' | |_| | |__| ___|    /
|___/|___/   |_| |_|_/ \_|_|\__|____/|____|____|_|\_\

MongoDB + mongoose  :  0.4.4
*/

const JWT = require("jsonwebtoken");
const mongoose = require("mongoose");
/** class representing a DBH */
class DBH {
	/**
	 * Create an instance of DataBase Handler
	 * @author happy-mama
	 * @version 0.4.4
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
			this.schemas.redirectUrlsModel.findOne({ id: id }).then(redirectUrl => {
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
	createRedirectUrl({ id, mesasge } = { id: "", mesasge: "" }) {
		return new Promise((result) => {
			let RUrl = new this.schemas.redirectUrlsModel({
				id: id,
				message: mesasge,
				redirectUrls: 0
			});
			this.cache.redirectUrls.set(id, RUrl);
			result(RUrl);
		});
	}

	// WEB AUTH

	/**
	 * Get `JWT` Object from `JWT` string
	 * @param {object} opts
	 * @param {string} opts.jwt 
	 * @returns {Promise<object>} `JWT` Object
	 */
	JWTVerify({ jwt } = { jwt: "" }) {
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
	};

	/**
	 * Create `JWT` string
	 * @param {object} opts
	 * @param {string} opts.login
	 * @param {string} opts.password
	 * @param {string} opts.email
	 * @returns {Promise<string>} `JWT` String
	 */
	JWTCreate({ login, password, email } = { login: "", password: "", email: "" }) {
		return new Promise((result) => {

			console.log(login, password, email)

			let coded = JWT.sign({
				login: login,
				password: password,
				email: email
			}, this.JWTS, {
				expiresIn: 1000 * 60 * 60 * 24 * 7
			});
			this.cache.web.jwt.set(coded, { login: login, password: password, email: email });
			result(coded);
		})
	};

	/**
	 * Get `User` from `DB` via `JWT` or `Auth` params
	 * @param {object} opts 
	 * @param {string | null} opts.jwt
	 * @param {{login: string, password: string, email: string} | null} opts.auth
	 * @returns {Promise<object>} `WUser` Object
	 */
	WgetUser({ jwt, auth } = { user: Object }) {
		return new Promise((result, reject) => {
			this.WcacheUser({jwt: jwt, auth: auth}).then(WUser => {
				result(WUser);
			}).catch(err => {
				reject(err);
			});
		})
	};
	/**
	 * Get `WUser` Object from `DBH Cache`
	 * @param {object} opts
	 * @param {string | null} opts.jwt
	 * @param {{login: string, password: string, email: string} | null} opts.auth
	 * @returns {Promise<object>} `WUser` Object
	 */
	WcacheUser({ jwt, auth } = { jwt: "", auth: "" }) {
		return new Promise((result, reject) => {
			if (jwt) { // get WUser via jwt
				this.JWTVerify({jwt: jwt}).then(decoded => {
					result(decoded);
				}).catch(err => {
					reject(err);
				})
			} else { // get WUser via auth
				let WUser = this.cache.web.users.get(auth.login + ":" + auth.password);
				if (!WUser) {
					WUser = this.cache.web.users.get(auth.email + ":" + auth.password);
				}
				if (WUser) {
					return result(WUser)
				}
				if (auth.login && auth.password) {
					this.schemas.web.WUserModel.findOne({
						login: auth.login,
						password: auth.password
					}).then(_WUser => {
						if (!_WUser) { return reject("ENOWUSER") }
						this.cache.web.users.set(_WUser.login + ":" + auth.password, _WUser)
						result(_WUser)
					})
				} else {
					this.schemas.web.WUserModel.findOne({
						password: auth.password,
						email: auth.email
					}).then(_WUser => {
						if (!_WUser) { return reject("ENOWUSER") }
						this.cache.web.users.set(_WUser.email + ":" + auth.password, _WUser)
						result(_WUser)
					})
				}
			}
		});
	};

	/**
	 * Create `WUser` Object and Save to `DB`
	 * @param {object} opts
	 * @param {string} opts.email
	 * @param {string} opts.login
	 * @param {string} opts.password 
	 * @returns {Promise<null>} `WUser` Object
	 */
	WcreateUser({ login, password, email } = { login: "", password: "", email: "" }) {
		return new Promise((result, reject) => {

			if (!password || !login) {
				return reject("ENOPASSORLOG")
			}

			this.schemas.web.WUserModel.findOne({
				login: login,
				email: email
			}).then(WUser => {
				if (WUser) {
					return reject("EPARAMSBUSY");
				}
				WUser = new this.schemas.web.WUserModel({
					login: login,
					password: password,
					email: email
				})
				if (login) {
					this.cache.web.users.set(login + ":" + password, WUser)
				} else {
					this.cache.web.users.set(email + ":" + password, WUser)
				}
				WUser.save()
				result(WUser);
			}).catch(err => {
				reject(err)
			})
		});
	};

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
	 * @returns {string} `Success`
	 */
	cacheSave() {
		this.cache.users.forEach(user => { user.save(); });
		this.cache.users.clear();

		this.cache.guilds.forEach(guild => { guild.save(); });
		this.cache.guilds.clear();

		this.cache.web.users.forEach(WUser => { WUser.save() });
		this.cache.web.users.clear();

		this.cache.web.jwt.clear();
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