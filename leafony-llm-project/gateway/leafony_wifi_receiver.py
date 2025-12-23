#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Leafony WiFi加速度監視システム
HTTP経由でLeafonyの加速度データと傾き状態を取得
"""

import requests
import time
from datetime import datetime

class LeafonyWiFiMonitor:
    def __init__(self, leafony_ip=None):
        self.leafony_ip = leafony_ip
        self.last_tilt_status = None
        self.message_count = 0

    def discover_leafony(self):
        """ネットワーク上のLeafonyを自動発見（10.14.0.xも含む）"""
        print("🔍 Searching for Leafony on network...")
        for base_ip in ["10.14.0", "192.168.1", "192.168.0"]:
            print(f"  Scanning {base_ip}.x range...")
            for i in range(1, 255):
                ip = f"{base_ip}.{i}"
                if self.test_leafony_connection(ip):
                    print(f"✅ Found Leafony at {ip}")
                    return ip
        print("❌ Leafony not found in scanned ranges.")
        return None

    def test_leafony_connection(self, ip, timeout=2):
        """指定IPでLeafony接続をテスト（/api/accelでJSON応答を確認）"""
        try:
            response = requests.get(f"http://{ip}/api/accel", timeout=timeout)
            if response.status_code == 200 and "accel_x" in response.text:
                return True
        except:
            pass
        return False

    def get_accel_status(self):
        """Leafonyから加速度データと傾き状態を取得（/api/accel）"""
        if not self.leafony_ip:
            return None
        try:
            response = requests.get(f"http://{self.leafony_ip}/api/accel", timeout=5)
            data = response.json()
            return {
                "accel_x": data.get("accel_x"),
                "accel_y": data.get("accel_y"),
                "accel_z": data.get("accel_z"),
                "tilt_status": data.get("tilt_status"),
                "uptime": data.get("uptime"),
                "ip_address": data.get("ip_address"),
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            print(f"❌ Failed to get accel data: {e}")
            return None

    def start_monitoring(self, interval=2):
        """WiFi経由での加速度監視を開始"""
        if not self.leafony_ip:
            self.leafony_ip = self.discover_leafony()

        if not self.leafony_ip:
            print("❌ Could not find Leafony on network.")
            print("💡 Please ensure:")
            print("  1. Leafony is connected to WiFi")
            print("  2. Leafony is on the same network as this computer")
            print("  3. Check Leafony's serial output for IP address")
            return

        print(f"🌐 Starting WiFi monitoring of Leafony at {self.leafony_ip}")
        print(f"📡 Polling interval: {interval} seconds")
        print(f"🌍 API Endpoint: http://{self.leafony_ip}/api/accel")
        print(f"\nPress Ctrl+C to stop")
        print("-" * 60)

        try:
            while True:
                accel = self.get_accel_status()
                if accel:
                    status = accel["tilt_status"]
                    if status != self.last_tilt_status:
                        self.message_count += 1
                        timestamp = datetime.now().strftime('%H:%M:%S')
                        icon = "⚠️" if status == "TILT_DETECTED" else "✅" if status == "STABLE" else "❓"
                        print(f"[{timestamp}] #{self.message_count:03d} {icon} {status}")
                        print(f"    Accel X: {accel['accel_x']}")
                        print(f"    Accel Y: {accel['accel_y']}")
                        print(f"    Accel Z: {accel['accel_z']}")
                        print(f"    Uptime: {accel['uptime']} sec")
                        print(f"    IP: {accel['ip_address']}")
                        print()
                        self.last_tilt_status = status
                time.sleep(interval)
        except KeyboardInterrupt:
            print(f"\n⏹️ WiFi monitoring stopped. Received {self.message_count} status changes.")
        except Exception as e:
            print(f"\n❌ Monitoring error: {e}")

def main():
    print("=== Leafony WiFi Accel Monitor ===")
    print("WiFi-based monitoring system")
    print("Features:")
    print("  • Automatic Leafony discovery")
    print("  • Real-time accel/tilt status monitoring")
    print("  • API endpoint integration")
    print()
    # IPアドレスを直接指定する場合
    # monitor = LeafonyWiFiMonitor("10.14.0.XXX")
    monitor = LeafonyWiFiMonitor()
    monitor.start_monitoring(interval=2)

if __name__ == "__main__":
    main()