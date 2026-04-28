/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class BluetoothService {
  private static instance: BluetoothService;
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;

  static getInstance() {
    if (!BluetoothService.instance) {
      BluetoothService.instance = new BluetoothService();
    }
    return BluetoothService.instance;
  }

  async requestDevice() {
    try {
      // Basic MIDI over Bluetooth GATT service UUID
      const MIDI_SERVICE_UUID = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
      
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [MIDI_SERVICE_UUID] }],
        optionalServices: ['generic_access', 'battery_service']
      });

      this.device = device;
      this.server = await device.gatt?.connect() || null;
      
      console.log('Connected to Bluetooth device:', device.name);
      return device;
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.server?.connected) {
      this.server.disconnect();
    }
    this.device = null;
    this.server = null;
  }

  isConnected() {
    return this.server?.connected || false;
  }

  // Helper for HID-like page turning (uses keyboard events)
  // Most Bluetooth pedals act as "Volume Up/Down" or "Page Up/Down"
  setupPedalControl(onPageUp: () => void, onPageDown: () => void) {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Common pedal mappings:
      // PageUp/Down, ArrowUp/Down, VolumeUp/Down (F10/F11)
      switch (e.key) {
        case 'PageUp':
        case 'ArrowUp':
          onPageUp();
          break;
        case 'PageDown':
        case 'ArrowDown':
        case ' ': // Space
          onPageDown();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }
}
