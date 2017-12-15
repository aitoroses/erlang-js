export type TaskHook = (parentZoneDelegate: ZoneDelegate, parentZone: Zone, targetZone: Zone, delegate: Function, source: any[]) => void
export type ErrorHook = (parentZoneDelegate: ZoneDelegate, parentZone: Zone, targetZone: Zone, delegate: Function, source: any[], error: Error) => void

export interface ZoneSpec {
  name: string
  onAfterTask: TaskHook
  onBeforeTask: TaskHook
  onHandleError: ErrorHook
}

export interface ZoneSpecArgs {
  name: string
  onAfterTask?: TaskHook
  onBeforeTask?: TaskHook
  onHandleError?: ErrorHook
}

export type ZoneDelegate = {
  handleError: (zone: Zone, e: Error) => void
}

const noop: any = function () {
} // tslint:disable-line

const emptySpecHooks = {
  onBeforeTask: noop,
  onAfterTask: noop,
  onHandleError: (parentZoneDelegate: ZoneDelegate, parentZone: Zone, targetZone: Zone, delegate: Function, source: any[], error: Error) => {
    console.error(new Error(this.name + ': ' + error.message))
  }
}

const WrapPlugins = {
  setTimeout (zone: Zone) {
    const setTimeout = global.setTimeout
    global.setTimeout = (task: Function, delay: number) => setTimeout(zone.wrap(task), delay)
    return () => global.setTimeout = setTimeout
  },

  setInterval (zone: Zone) {
    const setInterval = global.setInterval
    global.setInterval = (task: Function, delay: number) => setInterval(zone.wrap(task), delay)
    return () => global.setInterval = setInterval
  },

  HTMLEventListener (zone: Zone) {
    if ((global as any).HTMLElement) {
      const addEventListener = HTMLElement.prototype.addEventListener
      HTMLElement.prototype.addEventListener = function (...args) {
        args[ 1 ] = zone.wrap(args[ 1 ])
        return addEventListener.apply(this, args)
      }
      return () => HTMLElement.prototype.addEventListener = addEventListener
    } else {
      return () => {
      } // tslint:disable-line
    }
  },

  Promise (zone: Zone) {
    const promise: any = Promise
    const proto = Promise.prototype
    const ctor = Promise.constructor
    const thenfn = Promise.prototype.then
    const catchfn = Promise.prototype.catch

    const ZonePromise: any = function ZonePromise (...args) {
      args[ 0 ] = zone.wrap(args[ 0 ])
      return new promise(...args)
    };

    (global as any).Promise = ZonePromise

    ZonePromise.prototype = Object.create(proto)
    ZonePromise.reject = promise.reject
    ZonePromise.resolve = promise.resolve
    ZonePromise.all = promise.all
    ZonePromise.race = promise.race

    ZonePromise.constructor = function (...args) {
      args[ 0 ] = zone.wrap(args[ 0 ])
      return ctor.apply(this, args)
    }

    ZonePromise.prototype.then = function (...args) {
      args[ 0 ] = zone.wrap(args[ 0 ])
      return thenfn.apply(this, args)
    }

    ZonePromise.prototype.catch = function (...args) {
      args[ 0 ] = zone.wrap(args[ 0 ])
      return catchfn.apply(this, args)
    }

    return () => {
      (global as any).Promise = promise
      /*Promise.constructor = ctor
      Promise.prototype.then = thenfn
      Promise.prototype.catch = catchfn*/
    }
  }
}

export class Zone {

  public name: string
  public parentZone: Zone
  private zoneSpec: ZoneSpec

  constructor (zoneSpec: ZoneSpecArgs) {
    this.zoneSpec = Object.assign({}, emptySpecHooks, zoneSpec, Object.getPrototypeOf(zoneSpec))
    this.name = zoneSpec.name
  }

  static get current (): Zone {
    return currentZone
  }

  fork (zoneSpec: ZoneSpecArgs) {
    const zone = new Zone(zoneSpec)
    zone.parentZone = this
    return zone
  }

  run<A> (task: () => A) {
    this.runGuarded(task, [])
  }

  wrap (fn) {
    return (...args) =>
      this.runGuarded(fn, args)
  }

  private runGuarded<A> (fn: () => A, args: any[]): A | undefined {
    const previousZone = Zone.current
    currentZone = this

    const plugins = Object
    .keys(WrapPlugins)
    .map(pluginName => WrapPlugins[ pluginName ](this))

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
      result = fn(...args)
      this.zoneSpec.onAfterTask(parentDelegate, parentZone, this, delegate, source)
    } catch (error) {
      this.zoneSpec.onHandleError(parentDelegate, parentZone, this, delegate, source, error)
    }

    plugins.forEach(uw => uw())
    currentZone = previousZone
    return result
  }
}

const rootZone = new Zone({ name: '<root>' })
rootZone.parentZone = rootZone

let currentZone = rootZone
