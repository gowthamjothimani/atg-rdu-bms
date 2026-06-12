# Battery Monitoring System - RDU

A comprehensive industrial-grade battery monitoring dashboard for MEAN WELL lithium battery packs with Modbus TCP communication.

## 🏗️ Architecture

```
CAN-Battery/
├── backend/
│   ├── can.py              # Modbus TCP client for battery communication
│   ├── can_address.py      # Address mapping and battery state definitions
│   ├── app.py              # Flask REST API server
│   ├── requirements.txt    # Python dependencies
│   └── battery_logs.db     # SQLite database for historical data (auto-created)
│
├── frontend/
│   ├── public/
│   │   └── index.html      # React entry HTML
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── Dashboard.js
│   │   │   ├── DeviceConfig.js
│   │   │   ├── DataLog.js
│   │   │   ├── Sidebar.js
│   │   │   └── BatteryCard.js
│   │   ├── styles/         # CSS styling
│   │   │   ├── App.css
│   │   │   ├── Dashboard.css
│   │   │   ├── DeviceConfig.css
│   │   │   ├── DataLog.css
│   │   │   ├── BatteryCard.css
│   │   │   └── Sidebar.css
│   │   ├── App.js          # Main React app
│   │   └── index.js        # React DOM render
│   ├── package.json        # Node dependencies
│   └── .gitignore
│
├── main.py                 # (Original) CLI interface
├── can.py                  # (Original - moved to backend)
├── can_address.py          # (Original - moved to backend)
└── README.md
```

## 📋 Features

### Dashboard
- **Real-time Battery Monitoring**: Display SOC, voltage, current, temperature, and state
- **Device Cards**: Visual representation of each connected battery pack
- **Add/Remove Devices**: Manage devices from the dashboard
- **Logging Control**: Enable/disable data logging per device

### Device Configuration
- **Add Devices**: Configure battery packs with name, IP address, and port
- **Device List**: View all configured devices with connection status
- **Device Management**: Remove inactive or unnecessary devices

### Data Logging & Analytics
- **Live Charts**: Real-time graphs for SOC, voltage, current, and temperature
- **Historical Data**: View past readings in tabular format
- **Auto-Logging**: Logs data every 5 minutes when enabled
- **Device Selection**: Switch between different devices

### Industrial Theme
- Dark mode optimized for industrial environments
- Real-time status indicators
- Responsive design for desktop and tablet
- Smooth animations and transitions

## 🚀 Quick Start

### Prerequisites
- Python 3.8+ with pip
- Node.js 14+ with npm
- MEAN WELL HD67505-A1 Modbus TCP Gateway

### Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Install Python dependencies**
```bash
pip install -r requirements.txt
```

3. **Run the Flask server**
```bash
python app.py
```

The API will be available at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install Node dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm start
```

The UI will open at `http://localhost:3000`

## 🔌 API Endpoints

### Devices
- `GET /api/devices` - Get all configured devices
- `POST /api/devices` - Add new device
- `DELETE /api/devices/<device_id>` - Remove device
- `GET /api/devices/<device_id>/data` - Get current device data
- `POST /api/devices/<device_id>/logging` - Toggle data logging

### Data Logs
- `GET /api/logs/<device_id>` - Get historical logs (default 100 latest)

### Status
- `GET /api/status` - Get system status overview

## 📊 Data Structure

### Battery Data Response
```json
{
  "success": true,
  "status": "Connected",
  "data": {
    "soc_all_percent": 75,
    "pack_voltage_v": 51.2,
    "active_battery_count": 4,
    "passive_battery_count": 0,
    "battery_state": "Charging",
    "battery_state_code": 50,
    "pack_current_a": 12.5,
    "smart_charger_connected": true,
    "max_pack_temperature_c": 28.5,
    "min_pack_temperature_c": 27.2
  }
}
```

## 🗂️ Database Schema

The system automatically creates a SQLite database with the following structure:

```sql
CREATE TABLE battery_logs (
    id INTEGER PRIMARY KEY,
    device_id TEXT,
    device_name TEXT,
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
```

## 🔧 Configuration

### Device Settings
Edit device configuration directly in the UI:
- **Device Name**: Custom identifier (e.g., "Battery Pack 1")
- **IP Address**: Modbus TCP gateway IP (e.g., 10.90.2.10)
- **Port**: Modbus TCP port (default: 502)

### Data Logging
- Logging interval: 5 minutes (configurable in app.py)
- Can be enabled/disabled per device
- Data stored in local SQLite database

## 📈 Register Mapping

### Modbus TCP Registers

| Address | Description | Unit | Type |
|---------|-------------|------|------|
| 0 | State of Charge (All batteries) | % | Unsigned |
| 1 | Pack Voltage | V | Unsigned |
| 2 | Active Battery Count | count | Unsigned |
| 3 | Passive Battery Count | count | Unsigned |
| 10 | Battery State Code | code | Unsigned |
| 11 | Pack Current | A | Signed |
| 12 | Smart Charger Status | boolean | Unsigned |
| 13 | Maximum Pack Temperature | °C | Unsigned |
| 14 | Minimum Pack Temperature | °C | Unsigned |

### Battery State Codes
- 10: Standby
- 20: Ready
- 30: Disengaged
- 40: Discharging
- 50: Charging
- 70: Error

## 🐛 Troubleshooting

### Connection Issues
- Verify gateway IP address and port are correct
- Check network connectivity to the gateway
- Ensure firewall allows TCP communication on port 502

### No Data in Charts
- Verify logging is enabled for the device
- Wait 5 minutes for first data to be logged
- Check database file exists at `backend/battery_logs.db`

### API Connection Failed
- Ensure Flask backend is running on `http://localhost:5000`
- Check browser console for CORS errors
- Verify no other process is using port 5000

## 📝 Logging

System logs are generated in:
- **Backend**: Flask debug output in terminal
- **Frontend**: Browser console (F12)
- **Database**: `backend/battery_logs.db`

## 🎨 Customization

### Theme Colors
Edit CSS variables in `frontend/src/styles/App.css`:
```css
:root {
  --primary-bg: #1a1a1a;
  --accent-color: #00d4ff;
  --success: #4CAF50;
  /* ... more colors */
}
```

### Logging Interval
Edit in `backend/app.py`, `log_data_worker()` function:
```python
time.sleep(300)  # 300 seconds = 5 minutes
```

## 📦 Building for Production

### Frontend Build
```bash
cd frontend
npm run build
```

Output will be in `frontend/build/`

### Backend Deployment
Use a production WSGI server like Gunicorn:
```bash
pip install gunicorn
gunicorn app:app --workers 4 --bind 0.0.0.0:5000
```

## 📄 License

Proprietary - MEAN WELL Europe B.V.

## 📞 Support

For issues or questions, please contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: April 2026
