export class Logger {

  private static enabled = true

  static disable() {
    this.enabled = false
  }

  static enable() {
    this.enabled = true
  }

  static log(...args) {
    if (this.enabled) { console.log.apply(console, args) }
  }

  static error(...args) {
    if (this.enabled) { console.error.apply(console, args) }
  }

  static info(...args) {
    if (this.enabled) { console.info.apply(console, args) }
  }

}
