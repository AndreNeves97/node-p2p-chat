const net = require("net");

module.exports = class Peer {
  constructor(port) {
    this.port = port;
    this.connections = [];
    this.knownHosts = [];

    // Inicializa o servidor com a porta informada
    const server = net.createServer((socket) =>
      this.handleClientConnection(socket)
    );

    server.listen(port, () => console.log("Listening on port: ", port));
  }

  // Estabelece conexão com outro Peer que atua como servidor

  // Uma conexão loopback é feita quando o outro peer é servidor de uma nova conexão
  // O outro peer realiza outra conexão, mas agora como cliente.
  connectTo(address, sendKnownHosts = true, loopback = false) {
    const splittedAddress = address.split(":");

    if (splittedAddress.length < 2) {
      throw Error("Invalid host address. Expected host:port ");
    }

    const port = splittedAddress.splice(-1, 1)[0];
    const host = splittedAddress.join(":");

    const socket = net.createConnection({ port, host }, () => {
      // Adiciona Peer na lista de conexões ativas
      this.addConnection(socket);
      // Ativa a estuda de dados enviados pelo cliente
      this.listenClientData(socket);

      // Envia ao servidor a mensagem de boas vindas
      this.sendWelcomeMessage(socket, this.port, loopback, sendKnownHosts);

      console.log("Connected to", address);
      console.log("\n\n");
    });
  }

  // Função que envia a mensagem de boas vindas, com a porta de escuta.
  // A porta é enviada para possibilitar que o peer do outro lado possa realizar uma nova
  // conexão como cliente
  sendWelcomeMessage(socket, myPort, loopback = false, sendKnownHosts) {
    const obj = {
      type: "welcome",
      myPort,
      loopback,
      knownHosts: this.knownHosts,
    };

    this.sendMessage(socket, obj);
  }

  // Função que recebe e trata a mensagem de boas vindas
  handleWelcomeMessage(socket, data) {
    if (data.type !== "welcome") {
      return;
    }

    const { remoteAddress } = socket;
    const { myPort } = data;

    // Estabelecer conexão com novos peers descobertos
    this.connectToReceivedKnownHosts(data.knownHosts);

    const hostObj = this.getHostObj(remoteAddress, myPort);

    // Adiciona peer que enviou a mensagem de boas vindas à lista de hosts conhecidos
    this.addKnownHost(hostObj);

    // Se a mensagem enviada não for de uma conexão loopback, realiza a conexão loopback
    // O valor `myPort` é a porta enviada pelo outro Peer, que indica sua porta de escuta
    if (!data.loopback) {
      this.connectTo(`${remoteAddress}:${myPort}`, true, true);
    }
  }

  // Função invocada quando o Peer atual recebe lista de hosts conhecidos de outro peer
  connectToReceivedKnownHosts(knownHosts) {
    knownHosts.forEach((hostObj) => {
      this.connectToNewKnownHost(hostObj);
    });
  }

  // A função chamada para realizar conexão com algum peer descoberto
  connectToNewKnownHost(hostObj) {
    if (this.isKnownHost(hostObj)) {
      return;
    }

    this.connectTo(`${hostObj.host}:${hostObj.port}`, false);
  }

  getHostObj(host, port) {
    return { host, port };
  }

  // Função que inclui host na lista de hosts conhecidos
  addKnownHost(hostObj) {
    console.log("\n[Added known host ", hostObj);
    this.knownHosts.push(hostObj);
  }

  // Função que adicona novos sockets à lista de conexões ativas
  addConnection(socket) {
    this.connections.push(socket);
  }

  // Função que verifica se o host já é conhecido
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

  // Função que implementa a escuta de novas mensagens
  listenClientData(socket) {
    this.onConnection(socket);

    socket.on("data", (bufferData) => {
      const jsonData = bufferData.toString();
      const data = JSON.parse(jsonData);

      this.onData(socket, data);

      this.handleWelcomeMessage(socket, data);
    });
  }

  // Essa função desse ser sobrescrita pelo serviço que utiliza o P2P. Nesse caso, o arquivo index.js
  // Função que manipula dados recebidos
  onData(socket, data) {
    throw Error("onData handler not implemented");
  }

  // Essa função desse ser sobrescrita pelo serviço que utiliza o P2P. Nesse caso, o arquivo index.js
  // Função que manipula o evento de nova conexão
  onConnection(socket) {
    throw Error("onConnection handler not implemented");
  }

  // Envia uma mensagem a todos os peers conectados
  broadcastMessage(jsonData) {
    this.connections.forEach((socket) => this.sendMessage(socket, jsonData));
  }

  // Envia mensagem a um peer individual
  sendMessage(socket, jsonData) {
    const data = JSON.stringify(jsonData);

    try {
      if (!socket._writableState.ended) {
        socket.write(data);
      }
    } catch (e) {}
  }
};
