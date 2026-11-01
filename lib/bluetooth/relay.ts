import { decodePacket, encodeAck, scanMessage } from "./protocol";
export interface RelayResponse {
  success: boolean;
  status: string;
  student?: string;
  uid?: string;
  error?: string;
}
export interface RelayDependencies {
  post: (body: object) => Promise<RelayResponse>;
  acknowledge: (value: Uint8Array<ArrayBuffer>) => Promise<void>;
  report: (message: string, success: boolean, uid?: string) => void;
  received: () => void;
  updated: () => void;
}
export class ScanRelay {
  private busy = new Set<number>();
  private completed = new Map<
    number,
    { uid: string; response: RelayResponse }
  >();
  private heartbeatBusy = false;
  private stopped = false;
  constructor(
    private deviceId: string,
    private deps: RelayDependencies,
  ) {}
  stop() {
    this.stopped = true;
  }
  async accept(value: DataView) {
    if (this.stopped) return;
    let packet;
    try {
      packet = decodePacket(value);
    } catch (error) {
      this.deps.report((error as Error).message, false);
      return;
    }
    this.deps.received();
    if (packet.type === "heartbeat") {
      if (this.heartbeatBusy) return;
      this.heartbeatBusy = true;
      try {
        const response = await this.deps.post({
          action: "heartbeat",
          deviceId: this.deviceId,
        });
        if (!this.stopped && !response.success)
          this.deps.report(scanMessage(response.status), false);
      } catch {
        if (!this.stopped)
          this.deps.report(
            "Laptop cannot reach attendance. Check guest Wi-Fi sign-in or the local server.",
            false,
          );
      } finally {
        this.heartbeatBusy = false;
      }
      return;
    }
    const { sequence, uid } = packet;
    if (this.busy.has(sequence)) return;
    this.busy.add(sequence);
    try {
      const cached = this.completed.get(sequence);
      if (cached && cached.uid !== uid)
        throw new Error("Scanner sequence conflict. Reconnect the scanner.");
      let response = cached?.response;
      if (!response) {
        // Firmware resends the same sequence for up to 15 seconds. A temporary
        // network failure leaves it unacknowledged for that bounded retry window.
        response = await this.deps.post({
          action: "scan",
          deviceId: this.deviceId,
          uid,
        });
        if (this.stopped) return;
        if (response.status === "temporarily_unavailable") {
          this.deps.report(scanMessage(response.status), false, uid);
          return;
        }
        this.completed.set(sequence, { uid, response });
        if (this.completed.size > 64)
          this.completed.delete(this.completed.keys().next().value!);
        this.deps.report(
          scanMessage(response.status, response.student),
          response.success,
          uid,
        );
        if (response.status !== "queued_locally") this.deps.updated();
      }
      if (this.stopped) return;
      // Bluetooth writes fail now and then while the scanner is busy. The scan
      // is already saved, so try again quietly; the scanner also resends, and
      // a resend is answered from the cache above.
      const ack = encodeAck(sequence, response.status);
      try {
        await this.deps.acknowledge(ack);
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 150));
        if (!this.stopped) await this.deps.acknowledge(ack).catch(() => {});
      }
    } catch (error) {
      if (!this.stopped)
        this.deps.report(
          error instanceof Error && error.message.includes("sequence conflict")
            ? error.message
            : "Scan confirmation interrupted. Keep the scanner nearby; tap again if its LED flashes.",
          false,
          uid,
        );
    } finally {
      this.busy.delete(sequence);
    }
  }
}
