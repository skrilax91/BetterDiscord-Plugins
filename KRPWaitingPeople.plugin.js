/**
 * @name KRPWaitingPeople
 * @author Devix
 * @description This is a plugin that track user alone in customs voice channel and in BDA waiting room
 * @version 0.0.1
 */


module.exports = class CustomPinger {

    settings = {
      bda: false,
      douanes: false,
    }
  
    bdaChannelsCount = 0;
    douanesChannelsCount = 0;
    observers = [];
  
    constructor() {
      this.settings.bda = this.watchBda;
      this.settings.douanes = this.watchDouanes;
    }

    get watchBda() {
      let watch = BdApi.Data.load("KRPWaitingPeople", "watchBda");
      return watch === undefined ? false : watch;
    }

    set watchBda(value) {
      BdApi.Data.save("KRPWaitingPeople", "watchBda", value);
    }

    get watchDouanes() {
      let watch = BdApi.Data.load("KRPWaitingPeople", "watchDouanes");
      return watch === undefined ? false : watch;
    }

    set watchDouanes(value) {
      BdApi.Data.save("KRPWaitingPeople", "watchDouanes", value);
    }
  
    start() {
      this.tryToStart();
    }

    tryToStart() {
      this.bdaChannelsCount = 0;
      this.douanesChannelsCount = 0;
      const roomContainer = document.querySelector("[class^='scroller__'] ul");

      if (!roomContainer) {
        setTimeout(() => {
          this.tryToStart();
        }, 5000);

        BdApi.showToast(`an error occured`, {type: "error"});

        return;
      }

      this.reallyStart(roomContainer);
    }

    reallyStart(container) {
      const observer = this.getObserver();
  
      observer.observe(container, {childList: true, subtree: true});

      this.observers.push(observer);

      if (this.settings.bda) {
        BdApi.showToast(`Watching BDA channels`, {type: "info"});
      }

      if (this.settings.douanes) {
        BdApi.showToast(`Watching Douanes channels`, {type: "info"});
      }
      
      BdApi.DOM.onRemoved(container, () => {
        this.stop();
        this.tryToStart();
    });
    }

    getObserver() {
      return new MutationObserver((mutations) => {

        if (this.settings.bda) {
          const bdaChannels = this.BdaChannels; 

          // Check if a new channel is added
          if (bdaChannels.length > this.bdaChannelsCount) {
            BdApi.showToast(`New BDA channel detected`, {type: "success"});
            this.playSound();
          }

          // Check if a channel is removed
          if (bdaChannels.length < this.bdaChannelsCount) {
            BdApi.showToast(`BDA channel removed`, {type: "error"});
          }
          this.bdaChannelsCount = bdaChannels.length;
        }


        if (this.settings.douanes) {
          const douanesChannels = this.DouanesChannels;

          // Check if a new channel is added
          if (douanesChannels.length > this.douanesChannelsCount) {
            BdApi.showToast(`New Douanes channel detected`, {type: "success"});
            this.playSound();
          }

          // Check if a channel is removed
          if (douanesChannels.length < this.douanesChannelsCount) {
            BdApi.showToast(`Douanes channel removed`, {type: "error"});
          }

          this.douanesChannelsCount = douanesChannels.length;
        }
      });
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

    get BdaChannels() {
      // Get all channels that are BDA with aria-label & data-list-item-id attribute
      const channels = document.querySelectorAll("a[aria-label^='🔴 BDA ɴ°'][data-list-item-id^='channels___']");

      const containers = [];


      for (const channel of channels) {
        const container = channel.parentElement.parentElement.parentElement.parentElement;
        containers.push(container);
      }

      return containers;
    }

    get DouanesChannels() {
      // Get all channels that are BDA with aria-label & data-list-item-id attribute
      const channels = document.querySelectorAll("a[aria-label^='🔴ᴅᴏᴜᴀɴᴇ ɴ°'][data-list-item-id^='channels___']");

      const containers = [];

      for (const channel of channels) {
        const container = channel.parentElement.parentElement.parentElement.parentElement;
        containers.push(container);
      }

      return containers;
    }
  
  
  
    /* ------------------------------------------------------------------------------------------------
    * Settings Panel
    * ------------------------------------------------------------------------------------------------
    */
  
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
      body.classList = "card-body";
      panel.appendChild(body);
  
  
      const row1 = document.createElement("div");
      row1.classList = "row";
      body.appendChild(row1);
  
      const col1 = document.createElement("div");
      col1.classList = "col-6";
      row1.appendChild(col1);

      //add bda switch
      const bdaSwitch = document.createElement("div");
      bdaSwitch.classList = "form-check form-switch";
      col1.appendChild(bdaSwitch);

      const bdaSwitchInput = document.createElement("input");
      bdaSwitchInput.type = "checkbox";
      bdaSwitchInput.classList = "form-check-input";
      bdaSwitchInput.checked = this.settings.bda;
      bdaSwitchInput.onchange = () => {
        this.watchBda = bdaSwitchInput.checked;
        this.settings.bda = bdaSwitchInput.checked;
      }
      bdaSwitch.appendChild(bdaSwitchInput);

      const bdaSwitchLabel = document.createElement("label");
      bdaSwitchLabel.classList = "form-check-label";
      bdaSwitchLabel.innerHTML = "Watch BDA";
      bdaSwitch.appendChild(bdaSwitchLabel);

      //add douanes switch
      const douanesSwitch = document.createElement("div");
      douanesSwitch.classList = "form-check form-switch";
      col1.appendChild(douanesSwitch);

      const douanesSwitchInput = document.createElement("input");
      douanesSwitchInput.type = "checkbox";
      douanesSwitchInput.classList = "form-check-input";
      douanesSwitchInput.checked = this.settings.douanes;
      douanesSwitchInput.onchange = () => {
        this.watchDouanes = douanesSwitchInput.checked;
        this.settings.douanes = douanesSwitchInput.checked;
      }

      douanesSwitch.appendChild(douanesSwitchInput);

      const douanesSwitchLabel = document.createElement("label");
      douanesSwitchLabel.classList = "form-check-label";
      douanesSwitchLabel.innerHTML = "Watch Douanes";
      douanesSwitch.appendChild(douanesSwitchLabel);
      
  
      return panel;
    }
  };