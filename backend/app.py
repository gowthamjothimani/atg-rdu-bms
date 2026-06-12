import json
import sqlite3
from datetime import datetime
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from threading import Thread
import time
from can import CAN
import platform
import subprocess
import csv
from io import StringIO

app = Flask(__name__)
CORS(app)

# In-memory device management
devices = {}  # {device_id: {name, ip, port, is_active, logging_enabled, instance}}
logging_threads = {}  # {device_id: thread}
db_path = "battery_logs.db"


def init_db():
    """Initialize SQLite database for logging"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS battery_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            device_name TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            soc_percent REAL,
            voltage_v REAL,
            active_batteries INTEGER,
            passive_batteries INTEGER,
            battery_state TEXT,
            pack_current_a REAL,
            charger_connected INTEGER,
            max_temp_c REAL,
            min_temp_c REAL
        )
    """)
    conn.commit()
    conn.close()


def log_data_worker(device_id):
    """Background worker to log data every 5 minutes"""
    while device_id in devices and devices[device_id]["logging_enabled"]:
        try:
            if device_id in devices and devices[device_id]["is_active"]:
                can_instance = devices[device_id]["instance"]
                data = can_instance.read_data()
                
                if data["success"] and data["data"]:
                    device_info = devices[device_id]
                    conn = sqlite3.connect(db_path)
                    cursor = conn.cursor()
                    cursor.execute("""
                        INSERT INTO battery_logs 
                        (device_id, device_name, soc_percent, voltage_v, active_batteries, 
                         passive_batteries, battery_state, pack_current_a, charger_connected, 
                         max_temp_c, min_temp_c)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        device_id,
                        device_info["name"],
                        data["data"]["soc_all_percent"],
                        data["data"]["pack_voltage_v"],
                        data["data"]["active_battery_count"],
                        data["data"]["passive_battery_count"],
                        data["data"]["battery_state"],
                        data["data"]["pack_current_a"],
                        1 if data["data"]["smart_charger_connected"] else 0,
                        data["data"]["max_pack_temperature_c"],
                        data["data"]["min_pack_temperature_c"],
                    ))
                    conn.commit()
                    conn.close()
        except Exception as e:
            print(f"Error logging data for {device_id}: {str(e)}")
        
        # Sleep for 5 minutes
        time.sleep(300)


# ── API Routes ──

@app.route("/api/devices", methods=["GET"])
def get_devices():
    """Get all configured devices"""
    result = []
    for device_id, device in devices.items():
        result.append({
            "id": device_id,
            "name": device["name"],
            "ip": device["ip"],
            "port": device["port"],
            "is_active": device["is_active"],
            "logging_enabled": device["logging_enabled"],
            "status": "Connected" if device["is_active"] else "Disconnected",
        })
    return jsonify(result)


@app.route("/api/devices", methods=["POST"])
def add_device():
    """Add a new device"""
    data = request.json
    device_name = data.get("name")
    device_ip = data.get("ip")
    device_port = data.get("port", 502)
    
    if not device_name or not device_ip:
        return jsonify({"error": "Missing name or IP"}), 400
    
    device_id = f"{device_ip}:{device_port}"
    
    if device_id in devices:
        return jsonify({"error": "Device already configured"}), 400
    
    try:
        can_instance = CAN(ip=device_ip, port=device_port)
        can_instance.initialize()
        
        devices[device_id] = {
            "name": device_name,
            "ip": device_ip,
            "port": device_port,
            "is_active": can_instance.is_connected,
            "logging_enabled": False,
            "instance": can_instance,
        }
        
        return jsonify({
            "id": device_id,
            "name": device_name,
            "is_active": can_instance.is_connected,
            "status": can_instance.status,
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/devices/<device_id>", methods=["DELETE"])
def remove_device(device_id):
    """Remove a device"""
    if device_id not in devices:
        return jsonify({"error": "Device not found"}), 404
    
    device = devices[device_id]
    if device["instance"]:
        device["instance"].disconnect()
    
    # Stop logging thread if running
    if device_id in logging_threads:
        logging_threads[device_id].join(timeout=1)
        del logging_threads[device_id]
    
    del devices[device_id]
    return jsonify({"message": "Device removed"}), 200


@app.route("/api/devices/<device_id>/data", methods=["GET"])
def get_device_data(device_id):
    """Get current data from a device"""
    if device_id not in devices:
        return jsonify({"error": "Device not found"}), 404
    
    device = devices[device_id]
    if not device["is_active"]:
        return jsonify({"error": "Device not connected"}), 503
    
    try:
        data = device["instance"].read_data()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/devices/<device_id>/logging", methods=["POST"])
def toggle_logging(device_id):
    """Enable/disable data logging for a device"""
    if device_id not in devices:
        return jsonify({"error": "Device not found"}), 404
    
    data = request.json
    enable = data.get("enable", False)
    
    device = devices[device_id]
    device["logging_enabled"] = enable
    
    if enable:
        # Start logging thread
        if device_id not in logging_threads:
            thread = Thread(target=log_data_worker, args=(device_id,), daemon=True)
            thread.start()
            logging_threads[device_id] = thread
    else:
        # Stop logging thread
        if device_id in logging_threads:
            logging_threads[device_id].join(timeout=1)
            del logging_threads[device_id]
    
    return jsonify({
        "id": device_id,
        "logging_enabled": enable,
        "message": f"Logging {'enabled' if enable else 'disabled'}"
    }), 200


@app.route("/api/logs/<device_id>", methods=["GET"])
def get_device_logs(device_id):
    """Get historical logs for a device"""
    if device_id not in devices:
        return jsonify({"error": "Device not found"}), 404
    
    limit = request.args.get("limit", default=100, type=int)
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM battery_logs 
            WHERE device_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        """, (device_id, limit))
        
        logs = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return jsonify(logs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/logs/<device_id>/export", methods=["GET"])
def export_device_logs(device_id):
    """Export all logs for a device as CSV"""
    if device_id not in devices:
        return jsonify({"error": "Device not found"}), 404
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM battery_logs 
            WHERE device_id = ? 
            ORDER BY timestamp ASC
        """, (device_id,))
        
        logs = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        if not logs:
            return jsonify({"error": "No logs found for this device"}), 404
        
        # Create CSV in memory
        output = StringIO()
        fieldnames = [
            'id', 'device_id', 'device_name', 'timestamp', 'soc_percent',
            'voltage_v', 'active_batteries', 'passive_batteries', 'battery_state',
            'pack_current_a', 'charger_connected', 'max_temp_c', 'min_temp_c'
        ]
        
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        for log in logs:
            # Ensure all fields exist with None as default
            row = {field: log.get(field) for field in fieldnames}
            writer.writerow(row)
        
        # Generate filename with device name and timestamp
        device_name = devices[device_id]["name"]
        export_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{device_name}_battery_logs_{export_timestamp}.csv"
        
        # Return CSV data
        from flask import make_response
        response = make_response(output.getvalue())
        response.headers["Content-Disposition"] = f"attachment; filename={filename}"
        response.headers["Content-type"] = "text/csv"
        return response
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/status", methods=["GET"])
def get_status():
    """Get overall system status"""
    active_devices = sum(1 for d in devices.values() if d["is_active"])
    logging_devices = sum(1 for d in devices.values() if d["logging_enabled"])
    
    return jsonify({
        "total_devices": len(devices),
        "active_devices": active_devices,
        "logging_devices": logging_devices,
        "timestamp": datetime.now().isoformat(),
    })


def ping_ip(ip, timeout=2):
    """Check if an IP is reachable using ping"""
    try:
        if platform.system().lower() == "windows":
            output = subprocess.run(
                ["ping", "-n", "1", "-w", str(timeout * 1000), ip],
                capture_output=True,
                timeout=timeout + 1
            )
        else:
            output = subprocess.run(
                ["ping", "-c", "1", "-W", str(timeout * 1000), ip],
                capture_output=True,
                timeout=timeout + 1
            )
        return output.returncode == 0
    except Exception as e:
        print(f"Ping error for {ip}: {str(e)}")
        return False


@app.route("/api/devices/<device_id>/status", methods=["GET"])
def get_device_status(device_id):
    """Check if device is online/offline"""
    if device_id not in devices:
        return jsonify({"error": "Device not found"}), 404
    
    device = devices[device_id]
    is_online = ping_ip(device["ip"])
    
    return jsonify({
        "device_id": device_id,
        "ip": device["ip"],
        "is_online": is_online,
        "is_active": device["is_active"],
        "status": "Online" if is_online else "Offline"
    })


if __name__ == "__main__":
    init_db()
    app.run(debug=True, host="0.0.0.0", port=5100)
