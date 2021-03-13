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

  connectTo(address) {
    const splittedAddress = address.split(":");

    if (splittedAddress.length < 2) {
      throw Error("Invalid host address. Expected host:port ");
    }

    const port = splittedAddress.splice(-1, 1)[0];
    const host = splittedAddress.join(":");

    const hostObj = this.getHostObj(host, port);
    this.addKnownHost(hostObj);

    const socket = net.createConnection({ port, host }, () => {
      console.log("Connected to", address);
      console.log("\n\n");
      this.addConnection(socket);
      this.listenClientData(socket);
      this.sendWelcomeMessage(socket, this.port);
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
    knownHosts.forEach((hostObj) => this.connectToNewKnowHost(hostObj));
  }

  connectToNewKnowHost(hostObj) {
    const alreadyKnownHostObj = this.knownHosts.find(
      (knownHost) =>
        hostObj.port === this.port ||
        (knownHost.host === hostObj.host && knownHost.port && hostObj.port)
    );

    if (alreadyKnownHostObj) {
      return;
    }

    this.connectTo(`${hostObj.host}:${hostObj.port}`);
  }

  handleClientConnection(socket) {
    this.addConnection(socket);
    this.sendKnownHosts();
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

      if (this.isWelcomeMessage(data)) {
        const hostObj = this.getHostObj(socket.remoteAddress, data.myPort);
        this.addKnownHost(hostObj);
      }

      if (this.isKnowHostsMessage(data)) {
        this.connectToReceivedKnownHosts(data.knownHosts);
      }
    });
  }

  isWelcomeMessage(data) {
    return data.type === "welcome";
  }

  isKnowHostsMessage(data) {
    return data.type === "knowHosts";
  }

  onData(socket, data) {
    throw Error("onData handler not implemented");
  }

  onConnection(socket) {
    throw Error("onConnection handler not implemented");
  }

  sendKnownHosts() {
    console.log(
      "\n\nsend known hosts",
      this.knownHosts,
      this.connections.length
    );

    this.broadcastMessage({
      type: "knowHosts",
      knownHosts: this.knownHosts,
    });
  }

  sendWelcomeMessage(socket, myPort) {
    this.sendMessage(socket, {
      type: "welcome",
      myPort,
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
