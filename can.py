import threading
from pymodbus.client import ModbusTcpClient
from pymodbus.exceptions import ModbusException
from can_address import CAN_ADDRESS_MAP


class CAN:
    _instances: dict = {}
    _lock = threading.Lock()

    # ── singleton per (ip, port) 
    def __new__(cls, ip: str, port: int = 502):
        key = (ip, port)
        with cls._lock:
            if key not in cls._instances:
                instance = super().__new__(cls)
                cls._instances[key] = instance
                instance._initialized = False
            return cls._instances[key]

    # ── constructor / re-use guard 
    def __init__(self, ip: str, port: int = 502):
        if self._initialized:
            return
        self._initialized = True
        self.ip   = ip
        self.port = port
        self._initialize()

    # ── internal state reset 
    def _initialize(self):
        self.addr           = CAN_ADDRESS_MAP()
        self.client: ModbusTcpClient | None = None
        self.is_connected   = False
        self.success        = False
        self.status         = "Not connected"

        # Battery data
        self.soc_all            = -1        # %
        self.pack_voltage       = -1.0      # V
        self.active_bat_count   = -1
        self.passive_bat_count  = -1
        self.battery_state      = -1        # raw code
        self.battery_state_str  = "Unknown"
        self.pack_current       = -1.0      # A
        self.smart_charger      = False
        self.max_pack_temp      = -999.0    # °C
        self.min_pack_temp      = -999.0    # °C

    # ── public API 
    def initialize(self, forced: bool = False):
        if forced:
            self._initialize()
            self.start_device()
        else:
            if not self.is_connected:
                self.start_device()

    def start_device(self):
        try:
            if self.client and self.client.connected:
                self.client.close()

            self.client = ModbusTcpClient(host=self.ip, port=self.port, timeout=3)
            connected = self.client.connect()

            if connected:
                self.is_connected = True
                self.success      = True
                self.status       = "Connected"
            else:
                self.is_connected = False
                self.success      = False
                self.status       = f"Failed to connect to {self.ip}:{self.port}"

        except Exception as exc:
            self.is_connected = False
            self.success      = False
            self.status       = str(exc)

    def read_data(self) -> dict:
        if not self.is_connected or self.client is None:
            return self._error_payload("Device not connected")

        try:
            data = self._read_all_data()
            self.success = True
            self.status  = "Connected"
            return {
                "success": True,
                "status":  self.status,
                "data": data,
            }

        except ModbusException as exc:
            self.success      = False
            self.status       = str(exc)
            self.is_connected = False
            return self._error_payload(str(exc))

        except Exception as exc:
            self.success = False
            self.status  = str(exc)
            return self._error_payload(str(exc))

    # data reader
    def _read_all_data(self) -> dict:
        """Read all battery data from two register ranges: 0-3 and 10-14"""
        # Read first range: addresses 0-3 (SOC, voltage, battery counts)
        regs_low = self._read_registers(base=0, count=4)
        
        # Read second range: addresses 10-14 (battery state, current, temps)
        regs_high = self._read_registers(base=10, count=5)
        
        # Extract values from first range
        self.soc_all           = self._get_unsigned(regs_low, 0)
        self.pack_voltage      = float(self._get_unsigned(regs_low, 1)) / 1024  # Convert mV to V
        self.active_bat_count  = self._get_unsigned(regs_low, 2)
        self.passive_bat_count = self._get_unsigned(regs_low, 3)
        
        # Extract values from second range
        raw_state = self._get_unsigned(regs_high, 0)
        self.battery_state     = raw_state
        self.battery_state_str = self.addr.BATTERY_STATES.get(raw_state, f"Unknown ({raw_state})")
        
        self.pack_current      = float(self._get_signed(regs_high, 1))
        self.smart_charger     = bool(self._get_unsigned(regs_high, 2))
        
        raw_max_temp = self._get_unsigned(regs_high, 3)
        raw_min_temp = self._get_unsigned(regs_high, 4)
        self.max_pack_temp = float(raw_max_temp - self.addr.TEMP_OFFSET)
        self.min_pack_temp = float(raw_min_temp - self.addr.TEMP_OFFSET)
        
        return {
            "soc_all_percent":          self.soc_all,
            "pack_voltage_v":           self.pack_voltage,
            "active_battery_count":     self.active_bat_count,
            "passive_battery_count":    self.passive_bat_count,
            "battery_state":            self.battery_state_str,
            "battery_state_code":       self.battery_state,
            "pack_current_a":           self.pack_current,
            "smart_charger_connected":  self.smart_charger,
            "max_pack_temperature_c":   self.max_pack_temp,
            "min_pack_temperature_c":   self.min_pack_temp,
        }

    # register helpers
    def _read_registers(self, base: int, count: int) -> list[int]:
        response = self.client.read_holding_registers(
            address=base,
            count=count,
            slave=self.addr.slave_id,
        )
        if response.isError():
            raise ModbusException(
                f"Modbus error reading registers {base}–{base + count - 1}: {response}"
            )
        return response.registers

    def _get_unsigned(self, regs: list[int], index: int) -> int:
        """Get unsigned 16-bit value from register at index"""
        return regs[index] & 0xFFFF

    def _get_signed(self, regs: list[int], index: int) -> int:
        """Get signed 16-bit value from register at index"""
        val = regs[index] & 0xFFFF
        return val if val < 0x8000 else val - 0x10000

    # error payload
    @staticmethod
    def _error_payload(message: str) -> dict:
        return {
            "success": False,
            "status":  message,
            "data": None,
        }

    # cleanup 
    def disconnect(self):
        if self.client:
            self.client.close()
        self.is_connected = False
        self.status       = "Disconnected"