// Just enough of Node's Buffer for server/volunteers.mjs when it runs in the browser.
const encoder = new TextEncoder()
const decoder = new TextDecoder()

export class DeviceBuffer extends Uint8Array {
  static from(value, encoding) {
    if (typeof value !== 'string') return new DeviceBuffer(value)
    if (encoding === 'base64' || encoding === 'base64url') {
      const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'))
      return new DeviceBuffer(Array.from(binary, char => char.charCodeAt(0)))
    }
    if (encoding === 'hex') return new DeviceBuffer((value.match(/../g) ?? []).map(pair => parseInt(pair, 16)))
    return new DeviceBuffer(encoder.encode(value))
  }
  toString(encoding) {
    if (encoding === 'hex') return Array.from(this, byte => byte.toString(16).padStart(2, '0')).join('')
    if (encoding === 'base64' || encoding === 'base64url') {
      const base64 = btoa(String.fromCharCode(...this))
      return encoding === 'base64' ? base64 : base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    }
    return decoder.decode(this)
  }
  readUInt16BE(offset = 0) { return (this[offset] << 8) | this[offset + 1] }
}

if (typeof globalThis.Buffer === 'undefined') globalThis.Buffer = DeviceBuffer
