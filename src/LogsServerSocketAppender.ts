import * as net from 'net';

export default class LogsServerSocketAppender {
    public port = 0;
    public server: net.Server = null;
    constructor(private callback: (data: Buffer) => void) {}

    createServer() {
        this.server = net.createServer((socket: net.Socket) => {
            console.log('Client connect: ' + socket.localAddress + ':' + socket.localPort + '. client remote address : ' + socket.remoteAddress + ':' + socket.remotePort);

            socket.setEncoding('utf-8');
            socket.setTimeout(10000);

            // When receive client data.
            socket.on('data', data => {
                console.log(data.toString());
                if (this.callback) {
                    this.callback(data);
                }
            });

            // When client send data complete.
            socket.on('end', () => {
                console.log('Client disconnect.');

                // Get current connections count.
                this.server.getConnections((err, count) => {
                    if (!err) {
                        // Print current connection count in server console.
                        console.log('There are %d connections now. ', count);
                    } else {
                        console.error(JSON.stringify(err));
                    }
                });
            });

            // When client timeout.
            socket.on('timeout', () => {
                console.log('Client request time out. ');
            });

            socket.on('error', error => {
                console.error(JSON.stringify(error));
            });
        });
    }
    start(port = 9999) {
        this.port = port;
        this.createServer();
        this.server.listen(port, () => {
            // Get server address info.
            console.log('TCP server listen on address : ' + JSON.stringify(this.server.address()));

            this.server.on('close', () => {
                console.log('TCP server socket is closed.');
            });

            this.server.on('error', error => {
                console.error(JSON.stringify(error));
            });
        });
    }
    stop() {
        try {
            this.server.close(error => {
                console.error(JSON.stringify(error));
            });
        } catch (e) {}
        this.port = this.server = null;
    }
}
