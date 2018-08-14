const unirest = require("unirest");

class VakantieVeilingen {
  constructor(email, password) {
    this.email = email;
    this.password = password;
    this.ready = false;

    this.headers = {
      referer: "https://www.vakantieveilingen.nl/veiling-van-de-dag.html"
    };

    this.cookies;
  }

  login(callback) {
    this.ready = false;
    if (!this.cookies) {
      unirest
        .post("https://www.vakantieveilingen.nl/login.html")
        .send(`login=${this.email}`)
        .send(`password=${this.password}`)
        .send("isLoginLong=YES")
        .jar(true)
        .followRedirect(false)
        .end(response => {
          if (response.code === 200) {
            callback("Username or password incorrect!");
          } else if (response.code === 302) {
            this.ready = true;
            this.cookies = this.parseCookies(response.headers["set-cookie"]);
            callback();
          }
        });
    } else {
      callback();
    }
  }

  parseCookies(cookies) {
    let finalString = "";

    for (let i = 0; i < cookies.length; i++) {
      finalString += cookies[i].split(";")[0] + "; ";
    }

    return finalString;
  }

  makeRequest(endpoint, data = {}, callback = () => {}) {
    data.method = endpoint;
    data.api = "bid";

    unirest
      .post(
        `https://www.vakantieveilingen.nl/api.json?${new Date().getTime()}&m=${endpoint}&v=${new Date().getTime()}&js=1`
      )
      .type("json")
      .send(data)
      .headers(this.headers)
      .jar(true)
      .end(response => {
        callback(response.body);
      });
  }

  getUserIdFromUrl(url, callback = () => {}) {
    unirest
      .get(url)
      .jar(true)
      .end(response => {
        let id = response.body
          .split("pxl_customerid = ")[1]
          .split(",")[0]
          .split("'")
          .join("");

        callback(id);
      });
  }

  getLotIdFromUrl(url, callback = () => {}) {
    unirest
      .get(url)
      .jar(true)
      .end(response => {
        let id = response.body
          .split("pxl_lotid = ")[1]
          .split(",")[0]
          .split("'")
          .join("");

        callback(id);
      });
  }

  placeBid(lotId, amount, callback) {
    this.makeRequest("placeBid", { lotId: lotId, price: amount }, callback);
  }

  getBids(lotId, callback) {
    this.makeRequest("getLastByLotId", { limit: 1000, lotId: lotId }, callback);
  }
}

module.exports = VakantieVeilingen;
