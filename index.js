const colors = require("colors");
const options = require("./options.json");
const io = require("socket.io-client");
const VakantieVeilingen = require("./vvapi");

const api = new VakantieVeilingen(options.email, options.password);

let lotId;
let userId;

function init() {
  api.login(error => {
    if (error) {
      console.log(error);
    } else {
      console.log(
        `${"+".green.bold} Successfully logged in as ${options.email.bold}`
      );

      api.getLotIdFromUrl(options.lotUrl, lotIdNew => {
        api.getUserIdFromUrl(options.lotUrl, userIdNew => {
          lotId = lotIdNew;
          userId = userIdNew;
          initWebsocket();
        });
      });
    }
  });
}

function initWebsocket() {
  const serverId = "lp204websocket01_websocket9";

  api.cookies += `serverid=${serverId};`;

  const socket = io("https://www.vakantieveilingen.nl", {
    path: "/ws/",
    extraHeaders: {
      Cookie: api.cookies
    }
  });

  socket.on("connect", () => {
    console.log(
      `${"+".green.bold} Connected to server ${serverId.bold}. In room: ${
        lotId.bold
      }`
    );
    console.log(
      "--------------------------------------------------------------------"
        .bold
    );
    api.getBids(lotId, bids => {
      bids = bids.data;

      if (bids[0]) {
        console.log(
          `Latest bid by ${bids[0].customer.firstName.bold}. Price: ${
            bids[0].price.toString().bold
          }`
        );

        if (bids[0].customer.customerId !== userId) {
          onNewBid(bids[0].price);
        }
      } else {
        console.log(`No bids yet. Price: ${"0".bold}`);
        onNewBid(0);
      }

      console.log();

      socket.emit("joinRooms", ["/lot/" + lotId]);
    });
  });

  socket.on("roomMessage", function(message) {
    message = JSON.parse(message);
    switch (message.event) {
      case "bidsUpdate": {
        console.log(
          `${"+".green.bold} Bid increased by ${
            message.data.customer.firstName.bold
          } to ${message.data.price.toString().bold} ${
            message.data.currency.bold
          }`
        );

        if (message.data.customer.customerId !== userId) {
          onNewBid(message.data.price);
        }

        break;
      }

      case "auctionClosed": {
        console.log(`${"+".yellow.bold} Done! Restarting...`);
        console.log();
        console.log();
        console.log();
        socket.disconnect();
        init();
        break;
      }

      default: {
        console.log(message);
        break;
      }
    }
  });

  socket.on("disconnect", function() {
    console.log(`Disconnected from server ${serverId}`);
  });
}

function onNewBid(bid) {
  if (bid < options.maxBid) {
    console.log(`${"+".magenta.bold} Bid below current minimum, bidding 1...`);
    setTimeout(() => {
      api.placeBid(lotId, bid + 1, () => {});
    }, Math.floor(Math.random() * options.bidDelayMax) + options.bidDelayMin);
  }
}

init();