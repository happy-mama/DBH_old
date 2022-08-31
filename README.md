# DBH
Simple module to work with MongoDB. Created for Discord bots.

**Requires:**  "MongoDB",  "Mongoose"

You don't need to **save** changes! DBH has *cache* system, every 10 minutes it saves all changes and clearing cache!

**Examples:**

> importing

```js
// put your MongoDB data
const config = {
    user: "",
    password: "",
    host: "",
    database: "",
    prefix: "" // default prefix for guilds
}

global.DBH = require("path to 'DBH.js'")
global.DBH.init(config).then(() => {
    // make something
    client.login() // to let your database connect before discord
})
```
> geting user

```js
DBH.getUser({author: "author Object", guildId: "id of the guild with this author" }).then(_user => {
    // do something with user
    // for example:
    _user.stats.messages += 1
    // you don't need to write `user.save()`, cache system will make it automaticly
})
```

> getting guild

```js
DBH.getGuild({guild: "guild Object"}).then(_guild => {
    // do something with guild
    console.log(_guild.prefix)
})
```

> counting stats / example with discord.js

```js
client.on("messageCreate", async message => {
    global.DBH.getGuild({guild: message.guild}).then(_guild => {
        global.DBH.getUser({author: message.author, guildId: message.guild.id}).then(user => {
            // dont wory for ping, DBH will send only ONE request for ONE user in 10 minutes
            if (message.content.startsWith(_guild.prefix)) {
                // run command handler
            } else {
                user.stats.messages += 1;
            }
        });
    });
});
```

**FAQ**

> What cache?

When you use the `get*` method for the first time, the module sends a request to the database, the next time it will get the data from the cache, and after 10 minutes it will save all the changes at once.

> Why there is no `create*` method in example?

You don't need to create users, just use `get*` methods. As you can see, methods using whole author Object, DBH checks if a user in DB, and if there is no user, it creates it.

> mmm so simple?

DBH just works with cache and MongoDB, all what it do is just automating the geting/creating data process, and adds some optimization. Do with results what you want.

> Can I edit cache?

Sure! If your bot has `Eval` command it will be great! example: ```global.DBH.cache.users.get("authorId:guildId").stats.messages = 100```

> What means `role` parameter in users scheme?

It's just a part of my discord bot. I am using roles to give commands acces if user has "admin" role in DB. It's more better then use user id to give acces to some commands. You can edit roles in users cache to give it to someone else. Don't forget that you can edit scheme like you want'
