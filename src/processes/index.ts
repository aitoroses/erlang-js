import * as States from './states'
import { ProcessSystem } from './process_system'
import { Logger } from './logger'

const system = new ProcessSystem()

export { States, system, Logger }
export * from './process_system'
