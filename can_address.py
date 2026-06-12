class CAN_ADDRESS_MAP:
    def __init__(self):
        self.slave_id = 10
        
        # Simplified address mapping (address: description)
        self.SOC_ALL = 0                    # State of Charge - All batteries [%]
        self.PACK_VOLTAGE = 1               # Pack voltage [V]
        self.ACTIVE_BAT_COUNT = 2           # Active battery count
        self.PASSIVE_BAT_COUNT = 3          # Passive battery count
        
        self.BATTERY_STATE = 10             # Battery state code
        self.PACK_CURRENT = 11              # Pack current [A]
        self.SMART_CHARGER = 12             # Smart charger connected [boolean]
        self.MAX_PACK_TEMP = 13             # Maximum pack temperature [°C]
        self.MIN_PACK_TEMP = 14             # Minimum pack temperature [°C]
        
        self.TEMP_OFFSET = 55               # Temperature offset conversion
        
        # Battery State Lookup
        self.BATTERY_STATES = {
            10: "Standby",
            20: "Ready",
            30: "Disengaged",
            40: "Discharging",
            50: "Charging",
            70: "Error",
        }