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

    this.addKnownHost(host, port);

    const socket = net.createConnection({ port, host }, () => {
      console.log("Connected to", address);
      this.addConnection(socket);
      this.listenClientData(socket);
      this.sendWelcomeMessage(this.port);
    });
  }

  addKnownHost(host, port) {
    const hostObj = { host, port };
    console.log("\n[Added known host]", hostObj);
    this.knownHosts.push(hostObj);
  }

  handleClientConnection(socket) {
    this.addConnection(socket);
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
        this.addKnownHost(socket.remoteAddress, data.myPort);
      }
    });
  }

  isWelcomeMessage(data) {
    return data.type === "welcome";
  }

  onData(socket, data) {
    throw Error("onData handler not implemented");
  }

  onConnection(socket) {
    throw Error("onConnection handler not implemented");
  }

  sendWelcomeMessage(myPort) {
    this.sendMessage({
      type: "welcome",
      myPort,
    });
  }

  sendMessage(jsonData) {
    const data = JSON.stringify(jsonData);
    this.connections.forEach((socket) => socket.write(data));
  }
};
