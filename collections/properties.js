// roles
const roles = new Map();

roles.set("user", {level: 0});
roles.set("admin", {level: 1});
//---

module.exports = { roles };