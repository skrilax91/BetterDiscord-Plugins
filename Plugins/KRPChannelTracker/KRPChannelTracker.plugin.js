/**
 * @name KRP Channel Tracker
 * @description This is a plugin that track user alone in customs voice channel and in BDA waiting room
 * @version 0.0.10
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
    version: "0.0.10",
    description: "This is a plugin that track user alone in customs voice channel and in BDA waiting room",
    source: "",
    changelog: [
        {
            title: "Douane popout",
            type: "fixed",
            items: [
                "Fixed douane popout not showing up"
            ]
        }
    ],
    defaultConfig: [
        {
            type: "category",
            id: "general",
            name: "Général",
            collapsible: true,
            shown: false,
            settings: [
                {
                    type: "switch",
                    id: "fastDuty",
                    name: "Enable Fast Duty Button",
                    value: true
                }
            ]
        },
        {
            type: "category",
            id: "moderation",
            name: "Moderation",
            collapsible: true,
            shown: false,
            settings: [
                {
                    type: "switch",
                    id: "fastBdaConvocation",
                    name: "Enable Fast BDA Convocation Button on user menu",
                    value: false
                }
            ]
        },
        {
            type: "category",
            id: "douane",
            name: "Douanes",
            collapsible: true,
            shown: false,
            settings: [
                {
                    type: "switch",
                    id: "douaneSwitcher",
                    name: "Enable Douane Switcher",
                    value: false
                },
                {
                    type: "switch",
                    id: "watchcustoms",
                    name: "Watch Douanes Voice Channels",
                    value: false
                },
                {
                    type: "switch",
                    id: "watchcustomsAlert",
                    name: "Sound alert when someone join a douane",
                    value: false
                },
                {
                    type: "switch",
                    id: "douaneHelper",
                    name: "Enable utility button for douanes on user menu",
                    value: true
                }
            ]
        },
        {
            type: "category",
            id: "bda",
            name: "BDA",
            collapsible: true,
            shown: false,
            settings: [
                {
                    type: "switch",
                    id: "watchbda",
                    name: "Watch BDA Waiting Room",
                    value: false
                }
            ]
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
            this.css = `:root,
[data-bs-theme=light] {
  --bs-blue: #0d6efd;
  --bs-indigo: #6610f2;
  --bs-purple: #6f42c1;
  --bs-pink: #d63384;
  --bs-red: #dc3545;
  --bs-orange: #fd7e14;
  --bs-yellow: #ffc107;
  --bs-green: #198754;
  --bs-teal: #20c997;
  --bs-cyan: #0dcaf0;
  --bs-black: #000;
  --bs-white: #fff;
  --bs-gray: #6c757d;
  --bs-gray-dark: #343a40;
  --bs-gray-100: #f8f9fa;
  --bs-gray-200: #e9ecef;
  --bs-gray-300: #dee2e6;
  --bs-gray-400: #ced4da;
  --bs-gray-500: #adb5bd;
  --bs-gray-600: #6c757d;
  --bs-gray-700: #495057;
  --bs-gray-800: #343a40;
  --bs-gray-900: #212529;
  --bs-primary: #0d6efd;
  --bs-secondary: #6c757d;
  --bs-success: #198754;
  --bs-info: #0dcaf0;
  --bs-warning: #ffc107;
  --bs-danger: #dc3545;
  --bs-light: #f8f9fa;
  --bs-dark: #212529;
  --bs-primary-rgb: 13, 110, 253;
  --bs-secondary-rgb: 108, 117, 125;
  --bs-success-rgb: 25, 135, 84;
  --bs-info-rgb: 13, 202, 240;
  --bs-warning-rgb: 255, 193, 7;
  --bs-danger-rgb: 220, 53, 69;
  --bs-light-rgb: 248, 249, 250;
  --bs-dark-rgb: 33, 37, 41;
  --bs-primary-text-emphasis: #052c65;
  --bs-secondary-text-emphasis: #2b2f32;
  --bs-success-text-emphasis: #0a3622;
  --bs-info-text-emphasis: #055160;
  --bs-warning-text-emphasis: #664d03;
  --bs-danger-text-emphasis: #58151c;
  --bs-light-text-emphasis: #495057;
  --bs-dark-text-emphasis: #495057;
  --bs-primary-bg-subtle: #cfe2ff;
  --bs-secondary-bg-subtle: #e2e3e5;
  --bs-success-bg-subtle: #d1e7dd;
  --bs-info-bg-subtle: #cff4fc;
  --bs-warning-bg-subtle: #fff3cd;
  --bs-danger-bg-subtle: #f8d7da;
  --bs-light-bg-subtle: #fcfcfd;
  --bs-dark-bg-subtle: #ced4da;
  --bs-primary-border-subtle: #9ec5fe;
  --bs-secondary-border-subtle: #c4c8cb;
  --bs-success-border-subtle: #a3cfbb;
  --bs-info-border-subtle: #9eeaf9;
  --bs-warning-border-subtle: #ffe69c;
  --bs-danger-border-subtle: #f1aeb5;
  --bs-light-border-subtle: #e9ecef;
  --bs-dark-border-subtle: #adb5bd;
  --bs-white-rgb: 255, 255, 255;
  --bs-black-rgb: 0, 0, 0;
  --bs-font-sans-serif: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  --bs-font-monospace: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --bs-gradient: linear-gradient(180deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0));
  --bs-body-font-family: var(--bs-font-sans-serif);
  --bs-body-font-size: 1rem;
  --bs-body-font-weight: 400;
  --bs-body-line-height: 1.5;
  --bs-body-color: #212529;
  --bs-body-color-rgb: 33, 37, 41;
  --bs-body-bg: #fff;
  --bs-body-bg-rgb: 255, 255, 255;
  --bs-emphasis-color: #000;
  --bs-emphasis-color-rgb: 0, 0, 0;
  --bs-secondary-color: rgba(33, 37, 41, 0.75);
  --bs-secondary-color-rgb: 33, 37, 41;
  --bs-secondary-bg: #e9ecef;
  --bs-secondary-bg-rgb: 233, 236, 239;
  --bs-tertiary-color: rgba(33, 37, 41, 0.5);
  --bs-tertiary-color-rgb: 33, 37, 41;
  --bs-tertiary-bg: #f8f9fa;
  --bs-tertiary-bg-rgb: 248, 249, 250;
  --bs-heading-color: inherit;
  --bs-link-color: #0d6efd;
  --bs-link-color-rgb: 13, 110, 253;
  --bs-link-decoration: underline;
  --bs-link-hover-color: #0a58ca;
  --bs-link-hover-color-rgb: 10, 88, 202;
  --bs-code-color: #d63384;
  --bs-highlight-color: #212529;
  --bs-highlight-bg: #fff3cd;
  --bs-border-width: 1px;
  --bs-border-style: solid;
  --bs-border-color: #dee2e6;
  --bs-border-color-translucent: rgba(0, 0, 0, 0.175);
  --bs-border-radius: 0.375rem;
  --bs-border-radius-sm: 0.25rem;
  --bs-border-radius-lg: 0.5rem;
  --bs-border-radius-xl: 1rem;
  --bs-border-radius-xxl: 2rem;
  --bs-border-radius-2xl: var(--bs-border-radius-xxl);
  --bs-border-radius-pill: 50rem;
  --bs-box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  --bs-box-shadow-sm: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
  --bs-box-shadow-lg: 0 1rem 3rem rgba(0, 0, 0, 0.175);
  --bs-box-shadow-inset: inset 0 1px 2px rgba(0, 0, 0, 0.075);
  --bs-focus-ring-width: 0.25rem;
  --bs-focus-ring-opacity: 0.25;
  --bs-focus-ring-color: rgba(13, 110, 253, 0.25);
  --bs-form-valid-color: #198754;
  --bs-form-valid-border-color: #198754;
  --bs-form-invalid-color: #dc3545;
  --bs-form-invalid-border-color: #dc3545;
}

[data-bs-theme=dark] {
  color-scheme: dark;
  --bs-body-color: #dee2e6;
  --bs-body-color-rgb: 222, 226, 230;
  --bs-body-bg: #212529;
  --bs-body-bg-rgb: 33, 37, 41;
  --bs-emphasis-color: #fff;
  --bs-emphasis-color-rgb: 255, 255, 255;
  --bs-secondary-color: rgba(222, 226, 230, 0.75);
  --bs-secondary-color-rgb: 222, 226, 230;
  --bs-secondary-bg: #343a40;
  --bs-secondary-bg-rgb: 52, 58, 64;
  --bs-tertiary-color: rgba(222, 226, 230, 0.5);
  --bs-tertiary-color-rgb: 222, 226, 230;
  --bs-tertiary-bg: #2b3035;
  --bs-tertiary-bg-rgb: 43, 48, 53;
  --bs-primary-text-emphasis: #6ea8fe;
  --bs-secondary-text-emphasis: #a7acb1;
  --bs-success-text-emphasis: #75b798;
  --bs-info-text-emphasis: #6edff6;
  --bs-warning-text-emphasis: #ffda6a;
  --bs-danger-text-emphasis: #ea868f;
  --bs-light-text-emphasis: #f8f9fa;
  --bs-dark-text-emphasis: #dee2e6;
  --bs-primary-bg-subtle: #031633;
  --bs-secondary-bg-subtle: #161719;
  --bs-success-bg-subtle: #051b11;
  --bs-info-bg-subtle: #032830;
  --bs-warning-bg-subtle: #332701;
  --bs-danger-bg-subtle: #2c0b0e;
  --bs-light-bg-subtle: #343a40;
  --bs-dark-bg-subtle: #1a1d20;
  --bs-primary-border-subtle: #084298;
  --bs-secondary-border-subtle: #41464b;
  --bs-success-border-subtle: #0f5132;
  --bs-info-border-subtle: #087990;
  --bs-warning-border-subtle: #997404;
  --bs-danger-border-subtle: #842029;
  --bs-light-border-subtle: #495057;
  --bs-dark-border-subtle: #343a40;
  --bs-heading-color: inherit;
  --bs-link-color: #6ea8fe;
  --bs-link-hover-color: #8bb9fe;
  --bs-link-color-rgb: 110, 168, 254;
  --bs-link-hover-color-rgb: 139, 185, 254;
  --bs-code-color: #e685b5;
  --bs-highlight-color: #dee2e6;
  --bs-highlight-bg: #664d03;
  --bs-border-color: #495057;
  --bs-border-color-translucent: rgba(255, 255, 255, 0.15);
  --bs-form-valid-color: #75b798;
  --bs-form-valid-border-color: #75b798;
  --bs-form-invalid-color: #ea868f;
  --bs-form-invalid-border-color: #ea868f;
}

.justify-content-between {
    justify-content: space-between !important;
  }


@keyframes douane-backdrop {
    to { opacity: 0.85; }
}

@keyframes douane-modal-wrapper {
    to { transform: scale(1); opacity: 1; }
}

@keyframes douane-backdrop-closing {
    to { opacity: 0; }
}

@keyframes douane-modal-wrapper-closing {
    to { transform: scale(0.7); opacity: 0; }
}

#douane-modal-wrapper {
    z-index: 100;
}

#douane-modal-wrapper .callout-backdrop {
    animation: douane-backdrop 250ms ease;
    animation-fill-mode: forwards;
    opacity: 0;
    background-color: rgb(0, 0, 0);
    transform: translateZ(0px);
}

#douane-modal-wrapper.closing .callout-backdrop {
    animation: douane-backdrop-closing 200ms linear;
    animation-fill-mode: forwards;
    animation-delay: 50ms;
    opacity: 0.85;
}

#douane-modal-wrapper.closing .modal-wrapper {
    animation: douane-modal-wrapper-closing 250ms cubic-bezier(0.19, 1, 0.22, 1);
    animation-fill-mode: forwards;
    opacity: 1;
    transform: scale(1);
}

#douane-modal-wrapper .modal-wrapper {
    animation: douane-modal-wrapper 250ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
    animation-fill-mode: forwards;
    transform: scale(0.7);
    transform-origin: 50% 50%;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    contain: content;
    justify-content: center;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    user-select: none;
    z-index: 1000;
}

#douane-modal-wrapper .modal-body {
    background-color: #36393f;
    height: auto;
    width: auto;
    /*box-shadow: 0 0 0 1px rgba(32,34,37,.6), 0 2px 10px 0 rgba(0,0,0,.2);*/
    flex-direction: column;
    overflow: hidden;
    display: flex;
    flex: 1;
    contain: layout;
    position: relative;
    color: var(--white-500);
}

#douane-modal-wrapper #douane-modal {
    contain: layout;
    flex-direction: column;
    pointer-events: auto;
    border: 1px solid rgba(28,36,43,.6);
    border-radius: 5px;
    box-shadow: 0 2px 10px 0 rgba(0,0,0,.2);
    overflow: hidden;
}

#douane-modal-wrapper .header {
    background-color: #35393e;
    box-shadow: 0 2px 3px 0 rgba(0,0,0,.2);
    padding: 12px 20px;
    z-index: 1;
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    line-height: 19px;
}

#douane-modal-wrapper .modal-footer {
    background-color: #35393e;
    box-shadow: 0 -2px 3px 0 rgba(0,0,0,.2);
    padding: 12px 20px;
    z-index: 1;
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    line-height: 19px;
    display: flex;
    flex-shrink: 0;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
}


.douane-popout-header {
    color: var(--header-primary);
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
}

.douane-buttons {
    flex: 0 0 auto;
    flex-direction: column;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: stretch;
}

.color-white {
    color: var(--white-500);
}

.douane-buttons > button {
    background-color: var(--profile-gradient-button-color);
    color: var(--white-500);
    transition: opacity.2s ease-in-out;
    height: 32px;
    font-size: 14px;
    width: 100%;
    border-radius: 4px;
    margin-bottom: 4px;
}

.douane-buttons > button:hover {
    opacity: 0.8;
}

.douane-buttons > button:active {
    opacity: 0.6;
}

.btn {
    --bs-btn-padding-x: 0.75rem;
    --bs-btn-padding-y: 0.375rem;
    --bs-btn-font-family: ;
    --bs-btn-font-size: 1rem;
    --bs-btn-font-weight: 400;
    --bs-btn-line-height: 1.5;
    --bs-btn-color: var(--bs-body-color);
    --bs-btn-bg: transparent;
    --bs-btn-border-width: var(--bs-border-width);
    --bs-btn-border-color: transparent;
    --bs-btn-border-radius: var(--bs-border-radius);
    --bs-btn-hover-border-color: transparent;
    --bs-btn-box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 1px 1px rgba(0, 0, 0, 0.075);
    --bs-btn-disabled-opacity: 0.65;
    --bs-btn-focus-box-shadow: 0 0 0 0.25rem rgba(var(--bs-btn-focus-shadow-rgb), .5);
    display: inline-block;
    padding: var(--bs-btn-padding-y) var(--bs-btn-padding-x);
    font-family: var(--bs-btn-font-family);
    font-size: var(--bs-btn-font-size);
    font-weight: var(--bs-btn-font-weight);
    line-height: var(--bs-btn-line-height);
    color: var(--bs-btn-color);
    text-align: center;
    text-decoration: none;
    vertical-align: middle;
    cursor: pointer;
    -webkit-user-select: none;
    -moz-user-select: none;
    user-select: none;
    border: var(--bs-btn-border-width) solid var(--bs-btn-border-color);
    border-radius: var(--bs-btn-border-radius);
    background-color: var(--bs-btn-bg);
    transition: color .15s ease-in-out, background-color .15s ease-in-out, border-color .15s ease-in-out, box-shadow .15s ease-in-out;
}


.btn-sm {
    --bs-btn-padding-y: 0.25rem;
    --bs-btn-padding-x: 0.5rem;
    --bs-btn-font-size: 0.875rem;
    --bs-btn-border-radius: var(--bs-border-radius-sm);
}


.btn-success {
    --bs-btn-color: #fff;
    --bs-btn-bg: #198754;
    --bs-btn-border-color: #198754;
    --bs-btn-hover-color: #fff;
    --bs-btn-hover-bg: #157347;
    --bs-btn-hover-border-color: #146c43;
    --bs-btn-focus-shadow-rgb: 60, 153, 110;
    --bs-btn-active-color: #fff;
    --bs-btn-active-bg: #146c43;
    --bs-btn-active-border-color: #13653f;
    --bs-btn-active-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125);
    --bs-btn-disabled-color: #fff;
    --bs-btn-disabled-bg: #198754;
    --bs-btn-disabled-border-color: #198754;
}

.btn-success:hover {
    background-color: #157347;
}

.btn-warning {
    --bs-btn-color: #000;
    --bs-btn-bg: #ffc107;
    --bs-btn-border-color: #ffc107;
    --bs-btn-hover-color: #000;
    --bs-btn-hover-bg: #ffca2c;
    --bs-btn-hover-border-color: #ffc720;
    --bs-btn-focus-shadow-rgb: 217, 164, 6;
    --bs-btn-active-color: #000;
    --bs-btn-active-bg: #ffcd39;
    --bs-btn-active-border-color: #ffc720;
    --bs-btn-active-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125);
    --bs-btn-disabled-color: #000;
    --bs-btn-disabled-bg: #ffc107;
    --bs-btn-disabled-border-color: #ffc107;
}

.btn-warning:hover {
    background-color: #ffca2c;
}

.btn-danger {
    --bs-btn-color: #fff;
    --bs-btn-bg: #dc3545;
    --bs-btn-border-color: #dc3545;
    --bs-btn-hover-color: #fff;
    --bs-btn-hover-bg: #bb2d3b;
    --bs-btn-hover-border-color: #b02a37;
    --bs-btn-focus-shadow-rgb: 225, 83, 97;
    --bs-btn-active-color: #fff;
    --bs-btn-active-bg: #b02a37;
    --bs-btn-active-border-color: #a52834;
    --bs-btn-active-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125);
    --bs-btn-disabled-color: #fff;
    --bs-btn-disabled-bg: #dc3545;
    --bs-btn-disabled-border-color: #dc3545;
}

.btn-danger:hover {
    background-color: #bb2d3b;
}


button.btn-success {
    background-color: #43b581;
    color: var(--white-500);
}

button.btn-danger {
    background-color: #f04747;
    color: var(--white-500);
}

button.btn-warning {
    background-color: #faa61a;
    color: var(--white-500);
}

.alert {
    --bs-alert-bg: transparent;
    --bs-alert-padding-x: 1rem;
    --bs-alert-padding-y: 1rem;
    --bs-alert-margin-bottom: 1rem;
    --bs-alert-color: inherit;
    --bs-alert-border-color: transparent;
    --bs-alert-border: var(--bs-border-width) solid var(--bs-alert-border-color);
    --bs-alert-border-radius: var(--bs-border-radius);
    --bs-alert-link-color: inherit;
    position: relative;
    padding: var(--bs-alert-padding-y) var(--bs-alert-padding-x);
    margin-bottom: var(--bs-alert-margin-bottom);
    color: var(--bs-alert-color);
    background-color: var(--bs-alert-bg);
    border: var(--bs-alert-border);
    border-radius: var(--bs-alert-border-radius);
  }
  
  .alert-heading {
    color: inherit;
  }
  
  .alert-link {
    font-weight: 700;
    color: var(--bs-alert-link-color);
  }
  
  .alert-info {
    --bs-alert-color: var(--bs-info-text-emphasis);
    --bs-alert-bg: var(--bs-info-bg-subtle);
    --bs-alert-border-color: var(--bs-info-border-subtle);
    --bs-alert-link-color: var(--bs-info-text-emphasis);
  }

  .form-label {
    margin-bottom: 0.5rem;
  }
  
  .col-form-label {
    padding-top: calc(0.375rem + var(--bs-border-width));
    padding-bottom: calc(0.375rem + var(--bs-border-width));
    margin-bottom: 0;
    font-size: inherit;
    line-height: 1.5;
  }
  
  .col-form-label-lg {
    padding-top: calc(0.5rem + var(--bs-border-width));
    padding-bottom: calc(0.5rem + var(--bs-border-width));
    font-size: 1.25rem;
  }
  
  .col-form-label-sm {
    padding-top: calc(0.25rem + var(--bs-border-width));
    padding-bottom: calc(0.25rem + var(--bs-border-width));
    font-size: 0.875rem;
  }

.mb-3 {
    margin-bottom: 1rem;
}


.modal-body {
    position: relative;
    flex: 1 1 auto;
    padding: 1rem;
}

  .form-control {
    display: block;
    width: 100%;
    padding: 0.375rem 0.75rem;
    font-size: 1rem;
    font-weight: 400;
    line-height: 1.5;
    color: var(--bs-body-color);
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-color: var(--bs-body-bg);
    background-clip: padding-box;
    border: var(--bs-border-width) solid var(--bs-border-color);
    border-radius: var(--bs-border-radius);
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  }
  @media (prefers-reduced-motion: reduce) {
    .form-control {
      transition: none;
    }
  }
  .form-control[type=file] {
    overflow: hidden;
  }
  .form-control[type=file]:not(:disabled):not([readonly]) {
    cursor: pointer;
  }
  .form-control:focus {
    color: var(--bs-body-color);
    background-color: var(--bs-body-bg);
    border-color: #86b7fe;
    outline: 0;
    box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
  }
  .form-control::-webkit-date-and-time-value {
    min-width: 85px;
    height: 1.5em;
    margin: 0;
  }
  .form-control::-webkit-datetime-edit {
    display: block;
    padding: 0;
  }
  .form-control::-moz-placeholder {
    color: var(--bs-secondary-color);
    opacity: 1;
  }
  .form-control::placeholder {
    color: var(--bs-secondary-color);
    opacity: 1;
  }
  .form-control:disabled {
    background-color: var(--bs-secondary-bg);
    opacity: 1;
  }
  .form-control::-webkit-file-upload-button {
    padding: 0.375rem 0.75rem;
    margin: -0.375rem -0.75rem;
    -webkit-margin-end: 0.75rem;
    margin-inline-end: 0.75rem;
    color: var(--bs-body-color);
    background-color: var(--bs-tertiary-bg);
    pointer-events: none;
    border-color: inherit;
    border-style: solid;
    border-width: 0;
    border-inline-end-width: var(--bs-border-width);
    border-radius: 0;
    -webkit-transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  }
  .form-control::file-selector-button {
    padding: 0.375rem 0.75rem;
    margin: -0.375rem -0.75rem;
    -webkit-margin-end: 0.75rem;
    margin-inline-end: 0.75rem;
    color: var(--bs-body-color);
    background-color: var(--bs-tertiary-bg);
    pointer-events: none;
    border-color: inherit;
    border-style: solid;
    border-width: 0;
    border-inline-end-width: var(--bs-border-width);
    border-radius: 0;
    transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  }
  @media (prefers-reduced-motion: reduce) {
    .form-control::-webkit-file-upload-button {
      -webkit-transition: none;
      transition: none;
    }
    .form-control::file-selector-button {
      transition: none;
    }
  }
  .form-control:hover:not(:disabled):not([readonly])::-webkit-file-upload-button {
    background-color: var(--bs-secondary-bg);
  }
  .form-control:hover:not(:disabled):not([readonly])::file-selector-button {
    background-color: var(--bs-secondary-bg);
  }
  
  .form-control-plaintext {
    display: block;
    width: 100%;
    padding: 0.375rem 0;
    margin-bottom: 0;
    line-height: 1.5;
    color: var(--bs-body-color);
    background-color: transparent;
    border: solid transparent;
    border-width: var(--bs-border-width) 0;
  }
  .form-control-plaintext:focus {
    outline: 0;
  }
  .form-control-plaintext.form-control-sm, .form-control-plaintext.form-control-lg {
    padding-right: 0;
    padding-left: 0;
  }
  
  .form-control-sm {
    min-height: calc(1.5em + 0.5rem + calc(var(--bs-border-width) * 2));
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
    border-radius: var(--bs-border-radius-sm);
  }
  .form-control-sm::-webkit-file-upload-button {
    padding: 0.25rem 0.5rem;
    margin: -0.25rem -0.5rem;
    -webkit-margin-end: 0.5rem;
    margin-inline-end: 0.5rem;
  }
  .form-control-sm::file-selector-button {
    padding: 0.25rem 0.5rem;
    margin: -0.25rem -0.5rem;
    -webkit-margin-end: 0.5rem;
    margin-inline-end: 0.5rem;
  }
  
  .form-control-lg {
    min-height: calc(1.5em + 1rem + calc(var(--bs-border-width) * 2));
    padding: 0.5rem 1rem;
    font-size: 1.25rem;
    border-radius: var(--bs-border-radius-lg);
  }
  .form-control-lg::-webkit-file-upload-button {
    padding: 0.5rem 1rem;
    margin: -0.5rem -1rem;
    -webkit-margin-end: 1rem;
    margin-inline-end: 1rem;
  }
  .form-control-lg::file-selector-button {
    padding: 0.5rem 1rem;
    margin: -0.5rem -1rem;
    -webkit-margin-end: 1rem;
    margin-inline-end: 1rem;
  }
  
  textarea.form-control {
    min-height: calc(1.5em + 0.75rem + calc(var(--bs-border-width) * 2));
  }
  textarea.form-control-sm {
    min-height: calc(1.5em + 0.5rem + calc(var(--bs-border-width) * 2));
  }
  textarea.form-control-lg {
    min-height: calc(1.5em + 1rem + calc(var(--bs-border-width) * 2));
  }
  
  .form-control-color {
    width: 3rem;
    height: calc(1.5em + 0.75rem + calc(var(--bs-border-width) * 2));
    padding: 0.375rem;
  }
  .form-control-color:not(:disabled):not([readonly]) {
    cursor: pointer;
  }
  .form-control-color::-moz-color-swatch {
    border: 0 !important;
    border-radius: var(--bs-border-radius);
  }
  .form-control-color::-webkit-color-swatch {
    border: 0 !important;
    border-radius: var(--bs-border-radius);
  }
  .form-control-color.form-control-sm {
    height: calc(1.5em + 0.5rem + calc(var(--bs-border-width) * 2));
  }
  .form-control-color.form-control-lg {
    height: calc(1.5em + 1rem + calc(var(--bs-border-width) * 2));
  }

  .d-none {
    display: none !important;
  }`;
            this.popoutHtml = `<div id="douane-popout">
    <h2 class="douane-popout-header defaultColor__77578 {{eyebrow}} defaultColor__87d87 title_ef4a6d" data-text-variant="eyebrow">
        Douane
    </h2>
    <div class="douane-buttons">
        <button type="button" class="btn-warning" id="btn-douane">
            <div class="content">Passer la douane</div>
        </button>
        <button type="button" class="btn-danger" id="btn-blacklist">
            <div class="content">Blacklister le joueur</div>
        </button>
        <button type="button" class="btn-danger" id="btn-unwhitelist">
            <div class="content">DéWhitelister le joueur</div>
        </button>
    </div>
</div>`;
            this.douaneModal = `<div id="douane-modal-wrapper">
    <div class="callout-backdrop {{backdrop}}"></div>
    <div class="modal-wrapper">
        <div id="douane-modal" class="{{root}}">
            <div class="header"><div class="title">{{header}}</div></div>
            <div class="modal-body">
                <div class="alert alert-info" role="alert">
                    <h4 class="alert-heading">Bienvenue dans le module de douane</h4>
                    <p>Vous pouvez ici valider ou refuser la douane d'un joueur, ou encore le blacklister.</p>
                </div>
            
                <div class="mb-3">
                    <label for="douane-name" class="form-label">Prénom et Nom</label>
                    <input type="text" class="form-control" id="douane-name" placeholder="Prénom et Nom">
                </div>
                <div class="mb-3">
                    <label for="douane-note" class="form-label">Note</label>
                    <input type="text" class="form-control" id="douane-note" placeholder="Note">
                </div>
                <div class="mb-3">
                    <label for="douane-observations" class="form-label">Observations</label>
                    <textarea class="form-control" id="douane-observations" rows="2"></textarea>
                </div>
                <div class="mb-3">
                    <label for="douane-server-known" class="form-label"> Serveur connu via</label>
                    <input type="text" class="form-control" id="douane-server-known">
                </div>
            </div>
            <div class="modal-footer justify-content-between">
                <button type="button" class="btn btn-sm btn-danger">Blacklister le joueur</button>

                <button type="button" class="btn btn-sm btn-warning" id="douane-reject">Refuser la douane</button>
                <button type="button" class="btn btn-sm btn-success" id="douane-validate">Valider la douane</button>
            </div>
        </div>
    </div>
</div>`;
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
     return plugin(Plugin, Api);
})(global.ZeresPluginLibrary.buildPlugin(config));
/*@end@*/