/**
 * @name CustomPinger
 * @author Devix
 * @description This is a custom plugin that pings the user when someone join a specific voice channel
 * @version 0.0.1
 */


module.exports = class CustomPinger {

  settings = {
    whatchedChannels: []
  }

  observers = [];

  constructor() {
    this.settings.whatchedChannels = this.watchedChannels;
  }

  start() {
    // Start watching channels
    this.settings.whatchedChannels.forEach((channel) => this.startWatchingChannel(channel));
  }

  stop() {
    // Stop watching channels
    this.observers.forEach((observer) => observer.disconnect());
  }

  playSound() {
    let sound = new Audio("https://www.myinstants.com/media/sounds/roblox-death-sound_1.mp3");
    sound.volume = 1;
    sound.play();
  }



  startWatchingChannel(id) {
    const channelButton = document.querySelector(`[data-list-item-id="channels___${id}"]`)
    if (!channelButton) return BdApi.showToast(`Invalid Channel ID : ${id}`, {type: "error"});

    const channel = channelButton.parentElement.parentElement.parentElement.parentElement;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {

        console.log(mutation.addedNodes);

        if (mutation.addedNodes.length === 0) return;

        for (const node of mutation.addedNodes) {
          const selector = node.querySelector(`[class^="voiceUser__"]`);

          if (selector && selector.parentElement.parentElement.parentElement === channel) {
            BdApi.showToast(`Someone joined ${channel.innerText}`, {type: "info"});
            this.playSound();
          }
        }
      });
    });

    observer.observe(channel, {childList: true, subtree: true});

    BdApi.showToast(`Watching ${channel.innerText}`, {type: "success"});
    this.observers.push(observer);
  }



  /* ------------------------------------------------------------------------------------------------
  * Settings Panel
  * ------------------------------------------------------------------------------------------------
  */

  addWatchedChannelToList(parent, id) {
    const item = document.createElement("tr");


    const name = document.createElement("td")
    name.innerHTML = id;
    item.appendChild(name);

    const actions = document.createElement("td");
    item.appendChild(actions);

    const group = document.createElement("div");
    group.classList = "btn-group";
    actions.appendChild(group);

    const button = document.createElement("button");
    button.innerHTML = "Remove";
    button.classList = "btn btn-sm btn-danger";
    button.onclick = () => {
      this.settings.whatchedChannels = this.settings.whatchedChannels.filter((channel) => channel !== id);
      BdApi.Data.save("CustomPinger", "watchedChannels", this.settings.whatchedChannels);
      item.remove();
    }
    actions.appendChild(button);

    parent.appendChild(item);
  }


  getSettingsPanel() {
    const panel = document.createElement("div");
    panel.classList = "card bg-dark text-light"


    //add bootstrap
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
    panel.appendChild(link);


    //body
    const body = document.createElement("div");
    body.innerHTML = '<h3>Channel List</h3>';
    body.classList = "card-body";
    panel.appendChild(body);


    const row1 = document.createElement("div");
    row1.classList = "row";
    body.appendChild(row1);

    const col1 = document.createElement("div");
    col1.classList = "col-6";
    row1.appendChild(col1);

    //channel table
    const channelTable = document.createElement("table");
    channelTable.classList = "table table-dark table-striped table-hover";
    col1.appendChild(channelTable);

    const thead = document.createElement("thead");
    channelTable.appendChild(thead);

    const tr = document.createElement("tr")
    tr.innerHTML = `
      <th>Channel ID</th>
      <th>Actions</th>
      `;
    thead.appendChild(tr);

    const tbody = document.createElement("tbody");
    channelTable.appendChild(tbody);

    this.settings.whatchedChannels.forEach((channel) => this.addWatchedChannelToList(tbody, channel));

    const row2 = document.createElement("div");
    row2.classList = "row";
    body.appendChild(row2);

    const col2 = document.createElement("div");
    col2.classList = "col";
    row2.appendChild(col2);

    //add channel input
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Channel ID";
    input.classList = "form-control";
    col2.appendChild(input);

    const col3 = document.createElement("div");
    col3.classList = "col";
    row2.appendChild(col3);

    //add button
    const button = document.createElement("button");
    button.innerHTML = "Add Channel";
    button.classList = "btn btn-primary";
    button.onclick = () => {
      if (input.value.length === 0 || this.settings.whatchedChannels.includes(input.value)) return;
      this.settings.whatchedChannels.push(input.value);
      BdApi.Data.save("CustomPinger", "watchedChannels", this.settings.whatchedChannels);
      this.addWatchedChannelToList(tbody, input.value);
    }

    col3.appendChild(button);

    return panel;
  }


  get watchedChannels() {
    let watch = BdApi.Data.load("CustomPinger", "watchedChannels");

    if (!watch) {
      watch = [];
      BdApi.Data.save("CustomPinger", "watchedChannels", watch);
    }
    return watch;
  }

  set watchedChannel(value) {
    BdApi.Data.save("CustomPinger", "watchedChannel", value);
  }
};