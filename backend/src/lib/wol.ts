import dgram from "node:dgram";

const MAC_PATTERN = /^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/;

function buildMagicPacket(macAddress: string): Buffer {
  if (!MAC_PATTERN.test(macAddress)) {
    throw new Error(`Invalid MAC address: ${macAddress}`);
  }

  const macBytes = Buffer.from(macAddress.split(":").map((byte) => parseInt(byte, 16)));
  // 6 bytes of 0xFF followed by the target MAC repeated 16 times.
  return Buffer.concat([Buffer.alloc(6, 0xff), Buffer.concat(Array(16).fill(macBytes))]);
}

export function sendMagicPacket(
  macAddress: string,
  broadcastAddress: string,
  port: number,
): Promise<void> {
  const packet = buildMagicPacket(macAddress);
  const socket = dgram.createSocket("udp4");

  return new Promise((resolve, reject) => {
    socket.once("error", (err) => {
      socket.close();
      reject(err);
    });

    socket.bind(() => {
      socket.setBroadcast(true);
      socket.send(packet, port, broadcastAddress, (err) => {
        socket.close();
        if (err) reject(err);
        else resolve();
      });
    });
  });
}
