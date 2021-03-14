const Peer = require("./Peer");

let port;
let peer = null;

(function () {
  console.log("\n\n");
  main();

  // Escutar entrada do teclado
  process.stdin.on("data", (bufferData) => {
    const data = bufferData.toString();
    onNewInputMessage(data);
  });
})();

function main() {
  port = getPort();

  const hosts = getHosts();

  // Inicializar Peer a partir da porta informada
  peer = new Peer(port);

  // Conectar-se à cada host informado na inicialização
  hosts.forEach((peerAddress) => peer.connectTo(peerAddress));

  // Definir funções para manipular novas conexões e dados vindos para esse Peer
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
  if (data === "\n") {
    return;
  }

  if (!peer) {
    console.log("There's no active peer");
    return;
  }

  // Enviar mensagem digitada no terminal à todos os peers conectados a esse
  peer.broadcastMessage({ type: "message", message: data, myPort: port });
}

function onConnection(socket) {}

// Receber e exibir mensagem recebida
function onData(socket, data) {
  const { remoteAddress } = socket;
  const { type, message, myPort } = data;

  if (type === "message") {
    console.log(`\n[Message from ${remoteAddress}:${myPort}]: ${message}`);
  }
}
