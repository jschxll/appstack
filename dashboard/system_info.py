import psutil
import datetime as dt

def get_system_info():
    cpu_usage = psutil.cpu_percent()
    physical_cores = psutil.cpu_count(logical=False)

    memory = psutil.virtual_memory()
    total_memory = round(memory.total / 1_000_000_000, 2)
    available_mem = memory.available
    used_mem = round(memory.used / 1_000_000_000, 2)
    mem_percent = memory.percent

    disk = psutil.disk_usage("/")
    total_disk = round(disk.total / 1_000_000_000, 2)
    used_disk = round(disk.used / 1_000_000_000, 2)
    free_disk = round(disk.free / 1_000_000_000, 2)
    disk_percent = disk.percent

    cpu_temp = psutil.sensors_temperatures()["cpu_thermal"][0].current if hasattr(psutil, "sensors_temperatures") else None
    
    uptime = dt.datetime.now() - dt.datetime.fromtimestamp(psutil.boot_time())
    uptime = str(uptime).split(".")[0]

    return {
        "cpu": {
            "usage": cpu_usage,
            "temp": cpu_temp,
            "physical_cores": physical_cores,
        },
        "disk": {
            "total_mem": total_memory,
            "available_mem": available_mem,
            "used_mem": used_mem,
            "mem_percent": mem_percent,
            "total_disk": total_disk,
            "used_disk": used_disk,
            "disk_percent": disk_percent,
            "free_disk": free_disk
        },
        "uptime": uptime
    }