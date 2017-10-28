
interface ZoneSpec {
  name: string
  onBeforeTask: (parentZoneDelegate: ZoneDelegate, parentZone: Zone, targetZone: Zone, delegate: Function, source: any[]) => void
  onAfterTask: (parentZoneDelegate: ZoneDelegate, parentZone: Zone, targetZone: Zone, delegate: Function, source: any[]) => void
  onHandleError: (parentZoneDelegate: ZoneDelegate, parentZone: Zone, targetZone: Zone, delegate: Function, source: any[], error: Error) => void
}

interface ZoneSpecArgs {
  name: string
  onBeforeTask?: (parentZoneDelegate: ZoneDelegate, parentZone: Zone, targetZone: Zone, delegate: Function, source: any[]) => void
  onAfterTask?: (parentZoneDelegate: ZoneDelegate, parentZone: Zone, targetZone: Zone, delegate: Function, source: any[]) => void
  onHandleError?: (parentZoneDelegate: ZoneDelegate, parentZone: Zone, targetZone: Zone, delegate: Function, source: any[], error: Error) => void
}

type ZoneDelegate = {
  handleError: (zone: Zone, e: Error) => void
}

const noop: any = function() {} // tslint:disable-line

const emptySpecHooks = {
  onBeforeTask: noop,
  onAfterTask: noop,
  onHandleError: noop
}

const WrapPlugins = {
  setTimeout(zone: Zone) {
    const setTimeout = global.setTimeout
    global.setTimeout = (task: Function, delay: number) => setTimeout(zone.wrap(task), delay)
    return () => global.setTimeout = setTimeout
  },

  setInterval(zone: Zone) {
    const setInterval = global.setInterval
    global.setInterval = (task: Function, delay: number) => setInterval(zone.wrap(task), delay)
    return () => global.setInterval = setInterval
  },

  HTMLEventListener(zone: Zone) {
    if ((global as any).HTMLElement) {
      const addEventListener = HTMLElement.prototype.addEventListener
      HTMLElement.prototype.addEventListener = function (...args) {
        args[1] = zone.wrap(args[1])
        return addEventListener.apply(this, args)
      }
      return () => HTMLElement.prototype.addEventListener = addEventListener
    } else {
      return () => {} // tslint:disable-line
    }
  },

  Promise(zone: Zone) {
    const promise: any = Promise
    const ctor = Promise.constructor
    const thenfn = Promise.prototype.then
    const catchfn = Promise.prototype.catch

    ;(global as any).Promise = function (...args) {
      args[0] = zone.wrap(args[0])
      return new promise(...args)
    }

    Promise.constructor = function (...args) {
      args[0] = zone.wrap(args[0])
      return ctor.apply(this, args)
    }

    Promise.prototype.then = function (...args) {
      args[0] = zone.wrap(args[0])
      return thenfn.apply(this, args)
    }

    Promise.prototype.catch = function (...args) {
      args[0] = zone.wrap(args[0])
      return catchfn.apply(this, args)
    }

    return () => {
      (global as any).Promise = promise
      Promise.constructor = ctor
      Promise.prototype.then = thenfn
      Promise.prototype.catch = catchfn
    }
  }
}

export class Zone {

  public parentZone: Zone
  public name: string
  private zoneSpec: ZoneSpec

  constructor(zoneSpec: ZoneSpecArgs) {
    this.zoneSpec = Object.assign({}, emptySpecHooks, zoneSpec)
    this.name = zoneSpec.name
  }

  static get current(): Zone {
    return currentZone
  }

  fork(zoneSpec: ZoneSpecArgs) {
    const zone = new Zone(zoneSpec)
    zone.parentZone = this
    return zone
  }

  run<A>(task: () => A) {
    this.runGuarded(task, [])
  }

  wrap(fn) {
    return (...args) =>
      this.runGuarded(fn, args)
  }

  private runGuarded<A>(fn: () => A, args: any[]): A | undefined {
    const previousZone = Zone.current
    currentZone = this

    const plugins = Object
      .keys(WrapPlugins)
      .map(pluginName => WrapPlugins[pluginName](this))

    const delegate = fn
    const source = args

    const parentDelegate: ZoneDelegate = {
      handleError: (zone: Zone, error: Error) => {
        zone.zoneSpec.onHandleError(parentDelegate, zone.parentZone, this, delegate, source, error)
      }
    }

    const parentZone = this.parentZone || rootZone

    let result: A | undefined = undefined
    try {
      this.zoneSpec.onBeforeTask(parentDelegate, parentZone, this, delegate, source)
      result = fn()
      this.zoneSpec.onBeforeTask(parentDelegate, parentZone, this, delegate, source)
    } catch (error) {
      this.zoneSpec.onHandleError(parentDelegate, parentZone, this, delegate, source, error)
    }

    plugins.forEach(uw => uw())
    currentZone = previousZone
    return result
  }
}

const rootZone = new Zone({name: '<root>'})
rootZone.parentZone = rootZone

let currentZone = rootZone
