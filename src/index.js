const Peer = require("./Peer");

let port;
let peer = null;

(function () {
  console.log("\n\n");
  main();

  process.stdin.on("data", (bufferData) => {
    const data = bufferData.toString();
    onNewInputMessage(data);
  });
})();

function main() {
  port = getPort();

  const hosts = getHosts();
  peer = new Peer(port);

  hosts.forEach((peerAddress) => peer.connectTo(peerAddress));

  peer.onConnection = onConnection;
  peer.onData = onData;
}

function getPort() {
  const port = process.env.PORT;
  if (!port) throw Error("PORT not found");

  return port;
}

function getHosts() {
  return process.argv.slice(2);
}

function onNewInputMessage(data) {
  if (!peer) {
    console.log("There's no active peer");
    return;
  }

  peer.broadcastMessage({ type: "message", message: data, myPort: port });
}

function onConnection(socket) {}

function onData(socket, data) {
  const { remoteAddress } = socket;
  const { type, message, myPort } = data;

  if (type === "message") {
    console.log(`\n[Message from ${remoteAddress}:${myPort}]: ${message}`);
  }
}
