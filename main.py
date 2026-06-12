import json
import time
from can import CAN


MODBUS_IP   = "10.90.2.10"   # HD67505-A1 gateway IP address
MODBUS_PORT = 502             # Modbus TCP standard port
POLL_INTERVAL = 1


def main():
    print("=" * 60)
    print("MEAN WELL Europe Lithium Battery Pack – Modbus TCP Reader")
    print(f"Gateway : {MODBUS_IP}:{MODBUS_PORT}")
    print("=" * 60)

    device = CAN(ip=MODBUS_IP, port=MODBUS_PORT)
    device.initialize()

    if not device.is_connected:
        print(f"[ERROR] Could not connect: {device.status}")
        return

    print(f"[OK]  Connected to gateway – {device.status}\n")

    try:
        while True:
            data = device.read_data()
            _print_result(data)
            time.sleep(POLL_INTERVAL)

    except KeyboardInterrupt:
        print("\n[INFO] Stopped by user.")

    finally:
        device.disconnect()
        print("[INFO] Disconnected.")


def _print_result(data: dict):
    print(json.dumps(data, indent=4))


if __name__ == "__main__":
    main()