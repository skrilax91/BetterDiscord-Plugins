/**
 * @name KRP Channel Tracker
 * @description This is a plugin that track user alone in customs voice channel and in BDA waiting room
 * @version 0.0.6
 * @author Devix
 * @authorId 508968537977651201
 */
/*@cc_on
@if (@_jscript)
    
    // Offer to self-install for clueless users that try to run this directly.
    var shell = WScript.CreateObject("WScript.Shell");
    var fs = new ActiveXObject("Scripting.FileSystemObject");
    var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\\BetterDiscord\\plugins");
    var pathSelf = WScript.ScriptFullName;
    // Put the user at ease by addressing them in the first person
    shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
    if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
        shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
    } else if (!fs.FolderExists(pathPlugins)) {
        shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
    } else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
        fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
        // Show the user where to put plugins in the future
        shell.Exec("explorer " + pathPlugins);
        shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
    }
    WScript.Quit();

@else@*/
const config = {
    main: "index.js",
    id: "krp-channel-tracker",
    name: "KRP Channel Tracker",
    author: "Devix",
    authorId: "508968537977651201",
    authorLink: "",
    version: "0.0.6",
    description: "This is a plugin that track user alone in customs voice channel and in BDA waiting room",
    source: "",
    changelog: [
        {
            title: "Future Update",
            type: "progress",
            items: [
                "Add in Douane modal list of refused & blacklist"
            ]
        }
    ],
    defaultConfig: [
        {
            type: "switch",
            id: "watchbda",
            name: "Watch BDA Waiting Room",
            value: false
        },
        {
            type: "switch",
            id: "watchcustoms",
            name: "Watch Customs Voice Channels",
            value: false
        }
    ]
};
class Dummy {
    constructor() {this._config = config;}
    start() {}
    stop() {}
}
 
if (!global.ZeresPluginLibrary) {
    BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.name ?? config.info.name} is missing. Please click Download Now to install it.`, {
        confirmText: "Download Now",
        cancelText: "Cancel",
        onConfirm: () => {
            require("request").get("https://betterdiscord.app/gh-redirect?id=9", async (err, resp, body) => {
                if (err) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
                if (resp.statusCode === 302) {
                    require("request").get(resp.headers.location, async (error, response, content) => {
                        if (error) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
                        await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), content, r));
                    });
                }
                else {
                    await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                }
            });
        }
    });
}
 
module.exports = !global.ZeresPluginLibrary ? Dummy : (([Plugin, Api]) => {
     const plugin = (Plugin, Library) => {

    const {DiscordModules, PluginUpdater, Patcher} = Api;

    const {ConfirmationModal, Dispatcher, ChannelActions} = DiscordModules;
    
    return class extends Plugin {

        onStart() {
            PluginUpdater.checkForUpdate(
                config.name, 
                config.version, 
                "https://github.com/skrilax91/BetterDiscord-Plugins/blob/main/Plugins/KRPChannelTracker/KRPChannelTracker.plugin.js"
            );

            Patcher.before(Dispatcher, "dispatch", (_, args) => {
                const event = args[0];
                if (!event || !event.type || event.type !== "CHANNEL_CREATE") return;

                console.log("Channel created", event.channel.name);

                if (this.settings.watchbda) {
                    if (event.channel.name.includes("BDA ɴ°")) {
                        console.log("BDA channel created", event.channel.name);
                        this.showChannelCreateModal(event.channel.name, () => {
                            ChannelActions.selectVoiceChannel(event.channel.id);
                        });
                    }
                }

                if (this.settings.watchcustoms) {
                    if (event.channel.name.includes("ᴅᴏᴜᴀɴᴇ ɴ°")) {
                        console.log("Douanes channel created", event.channel.name);
                        this.showChannelCreateModal(event.channel.name, () => {
                            ChannelActions.selectVoiceChannel(event.channel.id);
                        });
                    }
                }

                return false;
            });
        }

        showChannelCreateModal(name, callback) {
            BdApi.showConfirmationModal("New channel created", `Channel ${name} created, do you want to join it ?`, {
                danger: false,
                confirmText: "Join",
                onConfirm: () => {
                    BdApi.showToast(`Channel ${name} joined`, {type: "info"});
                    callback();
                },
                cancelText: "Cancel",
                onCancel: () => {
                    BdApi.showToast(`Channel ${name} ignored`, {type: "info"});
                }
            });
        }


        onStop() {
            Patcher.unpatchAll();
        }

        getSettingsPanel() {
            const panel = this.buildSettingsPanel();
            return panel.getElement();
        }
    };

};
     return plugin(Plugin, Api);
})(global.ZeresPluginLibrary.buildPlugin(config));
/*@end@*/