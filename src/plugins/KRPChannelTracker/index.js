/**
 * 
 * @param {import("zerespluginlibrary").Plugin} Plugin 
 * @param {import("zerespluginlibrary").BoundAPI} Library 
 * @returns 
 */
module.exports = (Plugin, Library) => {

    const {DiscordModules, PluginUpdater, Patcher} = Api;

    const {ConfirmationModal, Dispatcher, ChannelActions} = DiscordModules;
    
    return class extends Plugin {

        onStart() {
            PluginUpdater.checkForUpdate(
                config.name, 
                config.version, 
                "https://raw.githubusercontent.com/skrilax91/BetterDiscord-Plugins/main/Plugins/KRPChannelTracker/KRPChannelTracker.plugin.js"
            );

            Patcher.before(Dispatcher, "dispatch", (_, args) => {
                const event = args[0];
                if (!event || !event.type || event.type !== "CHANNEL_CREATE") return;

                console.log("Channel created", event.channel.name);

                if (this.settings.watchbda) {
                    if (event.channel.name.includes("BDA ɴ°")) {
                        console.log("BDA channel created", event.channel.name);
                        this.playSound();
                        this.showChannelCreateModal(event.channel.name, () => {
                            ChannelActions.selectVoiceChannel(event.channel.id);
                        });
                    }
                }

                if (this.settings.watchcustoms) {
                    if (event.channel.name.includes("ᴅᴏᴜᴀɴᴇ ɴ°")) {
                        console.log("Douanes channel created", event.channel.name);
                        this.playSound();
                        this.showChannelCreateModal(event.channel.name, () => {
                            ChannelActions.selectVoiceChannel(event.channel.id);
                        });
                    }
                }

                return false;
            });
        }

        playSound() {
            let sound = new Audio("https://www.myinstants.com/media/sounds/roblox-death-sound_1.mp3");
            sound.volume = 1;
            sound.play();
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