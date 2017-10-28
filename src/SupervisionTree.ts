import {PID} from './types/pid'
import {Actor} from './Actors'

export class SupervisionTree {
  constructor(
    public pid: PID,
    public children: any[],
    public instance: Actor<any, any>) {
  }

  instantiateChild () {

  }
}
