/**
 * 
 * @param {import("zerespluginlibrary").Plugin} Plugin 
 * @param {import("zerespluginlibrary").BoundAPI} Library 
 * @returns 
 */
module.exports = (Plugin, Library) => {

    const {DiscordModules, PluginUpdater, Patcher, Utilities, ReactTools, DOMTools, DiscordClasses, WebpackModules} = Api;

    const {GuildMemberStore, Dispatcher, ChannelActions, MessageActions} = DiscordModules;

    const UserPopoutClasses = Object.assign({}, WebpackModules.getByProps("userPopoutOuter"), WebpackModules.getByProps("rolePill"), WebpackModules.getByProps("eyebrow"));
    const RoleClasses = Object.assign({}, DiscordClasses.PopoutRoles, WebpackModules.getByProps("rolePill"), WebpackModules.getByProps("roleName", "roleIcon"));
    const ModalClasses = WebpackModules.getByProps("root", "header", "small");

    const douaneBuffer = [];

    const krpGuildId = "953386925505540126";

    // Channels ID
    const validateDouaneId = "1064004917477515385";
    const rejectDouaneId = "1050392607643160586";
    const blacklistChanelId = "1064643022928756817";


    // Roles ID
    const refused1RoleId = "953547343532281886";
    const refused2RoleId = "953547720642142268";
    const refused3RoleId = "953547754393706558";
    const citizenRoleId = "953386925526503511";

    const onDutyRoleCorrelation = [
        // Douanier
        {roleId: "953386925564256302", onDutyRoleId: "1066482664569319475"},
    ]

        //////////////////////////////////////////
    // Render Functions
    //////////////////////////////////////////
    function DouanePopout({user, canWhitelist, canBlacklist, canUnwhitelist, onDouaneButton, onBlacklistButton, onUnwhitelistButton}) {
        if (!user) return null;

        console.log("DouanePopout", user, canWhitelist, canBlacklist, canUnwhitelist);
    
        return BdApi.React.createElement("div", {className: "douane-block"}, [
            BdApi.React.createElement("h2", {className: Utilities.formatString("douane-popout-header {{defaultColor}} {{eyebrow}} {{title}}", UserPopoutClasses)}, "Douane"),
            BdApi.React.createElement("div", {className: "douane-buttons"}, [
                BdApi.React.createElement("button", {onClick: () => onDouaneButton(user), type: "button", className: ("btn-warning " + ((!canWhitelist) ? "d-none" : "")), id: "btn-douane"}, "Douane"),
                BdApi.React.createElement("button", {onclick: onBlacklistButton(user), type: "button", className: ("btn-danger " + ((!canBlacklist) ? "d-none" : "")), id: "btn-blacklist"}, "Blacklist"),
                BdApi.React.createElement("button", {onclick: onUnwhitelistButton(user), type: "button", className: ("btn-danger " + ((!canUnwhitelist) ? "d-none" : "")), id: "btn-unwhitelist"}, "Unwhitelist"),
            ])
        ]);
    }



    return class extends Plugin {

        constructor() {
            super();
            this.css = require("style.css");
            this.popoutHtml = require("douane-block.html");
            this.douaneModal = require("douane-modal.html");
        }

        updateDouaneBuffer(id, values = {}) {
            for (let i = 0; i < douaneBuffer.length; i++) {
                if (douaneBuffer[i].userId === id) {
                    douaneBuffer[i] = Object.assign(douaneBuffer[i], values);
                    break;
                }
            }
        }

        onStart() {

            console.log("KRPChannelTracker started");

            PluginUpdater.checkForUpdate(
                config.name, 
                config.version, 
                "https://raw.githubusercontent.com/skrilax91/BetterDiscord-Plugins/main/Plugins/KRPChannelTracker/KRPChannelTracker.plugin.js"
            );

            BdApi.DOM.addStyle(this.name, this.css);

            
            console.log("Discord Classes", DiscordClasses.UserPopout);
            console.log("User Popout Classes", UserPopoutClasses);
            console.log("Role Classes", RoleClasses);

            this.popoutHtml = Utilities.formatString(this.popoutHtml, DiscordClasses.UserPopout);
            this.popoutHtml = Utilities.formatString(this.popoutHtml, RoleClasses);
            this.popoutHtml = Utilities.formatString(this.popoutHtml, UserPopoutClasses);
            this.douaneModal = Utilities.formatString(this.douaneModal, DiscordClasses.Backdrop);
            this.douaneModal = Utilities.formatString(this.douaneModal, {root: ModalClasses.root, small: ModalClasses.small});

            //this.bindPopouts();

            Patcher.before(Dispatcher, "dispatch", (_, args) => {
                const event = args[0];

                if (!event || !event.type) return;
                
                if (event.type === "CHANNEL_CREATE") {
                    this.onChannelCreate(event);
                }

                return false;
            });

            let test = BdApi.Webpack.getByStrings('.PENDING_INCOMING&&','Z.hidePersonalInformation','.PROFILE_POPOUT',{defaultExport:false})

            BdApi.Patcher.after("KRPChannelTracker-popout", test, "Z", (_, [props], returnValue) => {
                try {
                    console.log("Popout", props, returnValue);
                    if (!props || !props.user || !props.guild || props.guild.id != krpGuildId) return returnValue;
                    return this.patchPopouts(props, returnValue);
                } catch (e) {
                    console.error(e);
                    return returnValue;
                }
            });


            console.log("Test", test);
        }

        playSound() {
            let sound = new Audio("https://www.myinstants.com/media/sounds/roblox-death-sound_1.mp3");
            sound.volume = 1;
            sound.play();
        }

        onChannelCreate(event) {
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
                    if (this.settings.watchcustomsAlert) this.playSound();
                    this.showChannelCreateModal(event.channel.name, () => {
                        ChannelActions.selectVoiceChannel(event.channel.id);
                    });
                }
            }
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

        patchPopouts(props, returnValue) {
            console.log("patching", props);
            const user = GuildMemberStore.getMember(props.displayProfile.guildId, props.user.id);
            const name = GuildMemberStore.getNick(props.guildId, props.user.id) ?? props.user.username;

            console.log("Hello", user, name);

            // Add a douane section
            const douaneBlock = BdApi.React.createElement(DouanePopout, {
                user: user,
                canWhitelist: !user.roles.includes(citizenRoleId) && !user.roles.includes(refused3RoleId),
                canBlacklist: !user.roles.includes(citizenRoleId) && !user.roles.includes(refused3RoleId),
                canUnwhitelist: user.roles.includes(citizenRoleId),
                onDouaneButton: (user) => {
                    console.log("Douane button clicked");
                    this.onDouaneButton(user);
                },
                onBlacklistButton: () => {
                    this.onBlacklistButton.bind(this)
                },
                onUnwhitelistButton: () => {
                    this.onUnwhitelistButton.bind(this)
                }
            });

            // douaneButton?.addEventListener("click", () => this.onDouaneButton(user));
            // blacklistButton?.addEventListener("click", () => this.onBlacklistButton(user));
            // unwhitelistButton?.addEventListener("click", () => this.onUnwhitelistButton(user));


            returnValue.props.children.push(douaneBlock);

            return returnValue;
        }


        onDouaneButton(user) {
            console.log("Douane button clicked", user);

            const modal = this.createModal(this.douaneModal, { header: "Douane" });

            let result = {
                userId: user.userId,
                name: user.nick ?? "",
                note: 0,
                observations: "",
                serverKnown: "",
            };

            //try to get a buffer of douane
            let douaneBufferFound = false;
            for (let i = 0; i < douaneBuffer.length; i++) {
                const douane = douaneBuffer[i];
                if (douane.userId === user.userId) {
                    douaneBufferFound = true;

                    result.name = douane.name;
                    result.note = douane.note;
                    result.observations = douane.observations;
                    result.serverKnown = douane.serverKnown;
                    break;
                }
            }

            if (!douaneBufferFound) {
                douaneBuffer.push(result);
            }

            console.log("Douane", modal);

            modal.querySelector("#douane-name").value = result.name;
            modal.querySelector("#douane-note").value = result.note;
            modal.querySelector("#douane-observations").value = result.observations;
            modal.querySelector("#douane-server-known").value = result.serverKnown;

            modal.querySelector("#douane-name").addEventListener("input", (e) => {
                result.name = e.target.value;
                this.updateDouaneBuffer(user.userId, {name: result.name});
            });

            modal.querySelector("#douane-note").addEventListener("input", (e) => {
                result.note = e.target.value;
                this.updateDouaneBuffer(user.userId, {note: result.note});
            });

            modal.querySelector("#douane-observations").addEventListener("input", (e) => {
                result.observations = e.target.value;
                this.updateDouaneBuffer(user.userId, {observations: result.observations});
            });

            modal.querySelector("#douane-server-known").addEventListener("input", (e) => {
                result.serverKnown = e.target.value;
                this.updateDouaneBuffer(user.userId, {serverKnown: result.serverKnown});
            });

            modal.querySelector("#douane-validate").addEventListener("click", () => {
                this.validateDouane(result)

                modal.classList.add("closing");
                setTimeout(() => {modal.remove();}, 300);
            });

            modal.querySelector("#douane-reject").addEventListener("click", () => {
                this.rejectDouane(user, result);

                modal.classList.add("closing");
                setTimeout(() => {modal.remove();}, 300);
            });

            this.showModal(modal);
        }

        onBlacklistButton(user) {
            console.log("Blacklist button clicked");
        }

        onUnwhitelistButton(user) {
            // Remove whitelist role
            console.log("Unwhitelist button clicked");

        }

        validateDouane(result) {
            console.log("Douane validated");
            // Remove buffer
            for (let i = 0; i < douaneBuffer.length; i++) {
                if (douaneBuffer[i].userId === result.userId) {
                    douaneBuffer.splice(i, 1);
                    break;
                }
            }

            MessageActions.sendMessage(validateDouaneId, {
                content: this.generateDouaneMessage(result.userId, result.name, result.note, result.observations, result.serverKnown),
                tts: false,
                nonce: result.userId,
            });

            BdApi.showToast("Douane validated", {type: "success"});
        }

        rejectDouane(user, result) {
            console.log("Douane rejected");
            // Remove buffer
            for (let i = 0; i < douaneBuffer.length; i++) {
                if (douaneBuffer[i].userId === user.id) {
                    douaneBuffer.splice(i, 1);
                    break;
                }
            }

            // Set user role to refused1, refused2 or refused3
            let retryDate = null;

            // if user have no role, set to refused1
            if (!user.roles.includes(refused1RoleId) && !user.roles.includes(refused2RoleId) && !user.roles.includes(refused3RoleId)) {
                retryDate = new Date();
                retryDate.setDate(retryDate.getDate() + 1);
            } else if (user.roles.includes(refused1RoleId)) {
                retryDate = new Date();
                retryDate.setDate(retryDate.getDate() + 2);
            } else if (user.roles.includes(refused2RoleId)) {
                let shadowResutl = Object.assign({}, result);
                shadowResutl.note = "BL - 3 douanes refusées";
                shadowResutl.observations = "";
                shadowResutl.serverKnown = "";
                this.blacklistDouane(shadowResutl);
            }

            if (retryDate) {
                retryDate = Math.floor(retryDate.getTime() / 1000);
            }

            MessageActions.sendMessage(rejectDouaneId, {
                content: this.generateDouaneMessage(result.userId, result.name, result.note, result.observations, result.serverKnown, retryDate),
                tts: false,
                nonce: result.userId,
            });

            BdApi.showToast("Douane rejected", {type: "warning"});
        }


        blacklistDouane(result) {
            MessageActions.sendMessage(blacklistChanelId, {
                content: this.generateDouaneMessage(result.userId, result.name, result.note),
                tts: false,
                nonce: result.userId,
            });

            BdApi.showToast("Douane blacklisted", {type: "danger"});
        }


        onStop() {
            Patcher.unpatchAll();
            BdApi.Patcher.unpatchAll("KRPChannelTracker-popout");
            BdApi.DOM.removeStyle(this.name);
        }

        bindPopouts() {
            this.observer = this.patchPopouts.bind(this);
        }

        unbindPopouts() {
            this.observer = undefined;
        }

        getSettingsPanel() {
            const panel = this.buildSettingsPanel();
            return panel.getElement();
        }

        generateDouaneMessage(userId, name, note, observations = "", serverKnown = "", retryDate = null) {
            let message = `- **Prénom et Nom **: ${name}\n`;
            message += `- **Pseudo Discord **: <@${userId}>\n`
            message += `- **ID Discord **: ${userId}\n`
            message += `- **Note **: ${note}\n`
            if (observations != "") {
                observations = "> " + observations.replace(/\n/g, "\n> ");
                message += `- **Observations **:\n${observations}\n`
            }
            if (serverKnown != "") message += `- **Connu le serveur via **: ${serverKnown}\n`;
            if (retryDate) {
                // retryDate 24h later
                message += `- **Retenter la douane **: <t:${retryDate}>\n`
            }

            return message;
        }

        showModal(modal) {
            const popout = document.querySelectorAll(`[class^="popout_"]`);
            if (popout.length) {
                popout.forEach((p) => p.remove());
            }
            const app = document.querySelector(".app-19_DXt");
            if (app) app.append(modal);
            else document.querySelector("#app-mount").append(modal);

            const closeModal = (event) => {
                if (event.key !== "Escape") return;
                console.log("Close modal");
                modal.classList.add("closing");
                setTimeout(() => {modal.remove();}, 300);
            };
            document.addEventListener("keydown", closeModal, true);
            DOMTools.onRemoved(modal, () => document.removeEventListener("keydown", closeModal, true));
        }

        createModal(modalTemplate, options = {}) {
            const modal = DOMTools.createElement(Utilities.formatString(modalTemplate, options));

            const closeModal = () => {
                modal.classList.add("closing");
                setTimeout(() => {modal.remove();}, 300);
            };

            modal.querySelector(".callout-backdrop").addEventListener("click", closeModal);

            return modal;
        }
    };

};