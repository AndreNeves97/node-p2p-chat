const net = require("net");

module.exports = class Peer {
  constructor(port) {
    this.port = port;
    this.connections = [];
    this.knownHosts = [];

    const server = net.createServer((socket) =>
      this.handleClientConnection(socket)
    );

    server.listen(port, () => console.log("Listening on port: ", port));
  }

  connectTo(address, sendKnownHosts = true, loopback = false) {
    const splittedAddress = address.split(":");

    if (splittedAddress.length < 2) {
      throw Error("Invalid host address. Expected host:port ");
    }

    const port = splittedAddress.splice(-1, 1)[0];
    const host = splittedAddress.join(":");

    const socket = net.createConnection({ port, host }, () => {
      this.addConnection(socket);
      this.listenClientData(socket);

      if (sendKnownHosts) {
        this.sendKnownHosts();
      }

      this.sendWelcomeMessage(socket, this.port, loopback);

      console.log("Connected to", address);
      console.log("\n\n");
    });
  }

  getHostObj(host, port) {
    return { host, port };
  }

  addKnownHost(hostObj) {
    console.log("\n[Added known host ", hostObj);
    this.knownHosts.push(hostObj);
  }

  connectToReceivedKnownHosts(knownHosts) {
    knownHosts.forEach((hostObj) => {
      this.connectToNewKnownHost(hostObj);
      console.log("\n\nconnect", hostObj, "\n\n");
    });
  }

  connectToNewKnownHost(hostObj) {
    if (this.isKnownHost(hostObj)) {
      return;
    }

    this.connectTo(`${hostObj.host}:${hostObj.port}`, false);
  }

  isKnownHost(hostObj) {
    if (hostObj.port === this.port) {
      return true;
    }

    const alreadyKnownHostObj = this.knownHosts.find(
      (knownHost) =>
        knownHost.host === hostObj.host && knownHost.port === hostObj.port
    );

    return alreadyKnownHostObj != null;
  }

  handleClientConnection(socket) {
    this.listenClientData(socket);
  }

  addConnection(socket) {
    this.connections.push(socket);
  }

  listenClientData(socket) {
    this.onConnection(socket);

    socket.on("data", (bufferData) => {
      const jsonData = bufferData.toString();
      const data = JSON.parse(jsonData);

      this.onData(socket, data);

      this.handleWelcomeMessage(socket, data);
      this.handleKnowHostsMessage(socket, data);
    });
  }

  handleWelcomeMessage(socket, data) {
    if (data.type !== "welcome") {
      return;
    }

    const { remoteAddress } = socket;
    const { myPort } = data;

    const hostObj = this.getHostObj(remoteAddress, myPort);

    this.addKnownHost(hostObj);

    if (!data.loopback) {
      this.connectTo(`${remoteAddress}:${myPort}`, true, true);
    }
  }

  handleKnowHostsMessage(socket, data) {
    if (data.type !== "knowHosts") {
      return;
    }

    this.connectToReceivedKnownHosts(data.knownHosts);
  }

  onData(socket, data) {
    throw Error("onData handler not implemented");
  }

  onConnection(socket) {
    throw Error("onConnection handler not implemented");
  }

  sendKnownHosts() {
    console.log(
      "\n\n[send my known hosts]",
      this.knownHosts,
      this.connections.length
    );

    this.broadcastMessage({
      type: "knowHosts",
      knownHosts: this.knownHosts,
    });
  }

  sendWelcomeMessage(socket, myPort, loopback = false) {
    this.sendMessage(socket, {
      type: "welcome",
      myPort,
      loopback,
    });
  }

  broadcastMessage(jsonData) {
    this.connections.forEach((socket) => this.sendMessage(socket, jsonData));
  }

  sendMessage(socket, jsonData) {
    const data = JSON.stringify(jsonData);
    socket.write(data);
  }
};
