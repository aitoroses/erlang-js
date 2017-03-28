import { ProcessSystem, system, Tuple, PID, States } from '..'

export type GenServerType<T> = {
  init<T>(...args): T
  handle_call?(request, from, state: T): Promise<Tuple>
  handle_cast?(request, state: T): Promise<Tuple>
  terminate?(reason, state: T): Tuple
}

export class GenServer {

  private static _system = system

  static start_link<T>(Module: GenServerType<T>, args, { name } = { name: '' }) {

    // Initial state
    let state = Module.init<T>(args)
    let pid = GenServer._system.spawn_link(function*() {

      yield system.receive(async function(payload) {
        const type = payload.get(0)
        const request = payload.get(1)

        switch (type) {
          case Symbol.for('call'): {

            // Ensure that handle_call is implemented by the module
            if (!Module.handle_call) {
              GenServer._system.exit(
                pid,
                `Not implemented handle_call by ${Object.getPrototypeOf(Module).constructor.name}`
              )
              break
            }

            const from = payload.get(2)
            const result = await Module.handle_call(request, from, state)

            // reply | noreply | stop
            const outcome = result.get(0)

            if (outcome === 'reply') {
              const reply = result.get(1)
              const new_state = result.get(2)
              state = new_state

              // Use from for responding
              let replyPid = from.get(0)
              GenServer._system.send(replyPid, new Tuple('ok', reply))

            } else if (outcome === 'noreply') {
              const new_state = result.get(1)
              state = new_state

              // Use from for responding
              let replyPid = from.get(0)
              GenServer._system.send(replyPid, null)

            } if (outcome === 'stop') {
              const reason = result.get(1)
              const reply = result.get(2)
              const new_state = result.get(3)
              state = new_state

              // Use from for responding
              let replyPid = from.get(0)
              GenServer._system.send(replyPid, reply)
              GenServer._system.send(
                replyPid,
                new Tuple(Symbol.for('terminate'))
              )
            }

            break
          }

          case 'cast': { /* tslint:disable-line */
            if (!Module.handle_cast) {
              GenServer._system.exit(
                pid,
                `Not implemented handle_cast by ${Object.getPrototypeOf(Module).constructor.name}`
              )
              break
            }
            const result = await Module.handle_cast(request, state)
            const outcome = result.get(0)
            const new_state = result.get(1)
            state = new_state
            break
          }

          case 'terminate': { /* tslint:disable-line */
            if (Module.terminate) {
              const reason = payload.get(1)
              let result = Module.terminate(reason, state)
              let nextProcessState = result.get(0)
              if (nextProcessState === States.NORMAL) {
                const from = payload.get(2)
                let replyPid = from.get(0)
                GenServer._system.send(replyPid, result)
              } else {
                throw Error(`Could not terminate GenServer normally`)
              }
            }
          }
        }
      })
    })

    // Register the name globally
    if (name) {
      system.register(name, pid)
    }

    return pid
  }

  static call<T>(pid, request, timeout = 5000) {

    let callerPid = GenServer._system.self()

    // Create a request from reference with {pid, tag}
    let from = new Tuple(callerPid, GenServer._system.make_ref())

    // Create the request payload
    let payload = new Tuple(Symbol.for('call'), request, from)

    // Send the request to GenServer
    GenServer._system.send(pid, payload)

    // Return receiving state
    return system.receive(function(v) {
      return v
    }, timeout)

  }

  static cast(pid, request) {

    // Create the request payload
    let payload = new Tuple(Symbol.for('cast'), request)

    // Send the request to a process
    GenServer._system.send(pid, payload)
  }

}
