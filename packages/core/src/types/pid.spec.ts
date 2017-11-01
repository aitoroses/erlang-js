import { test } from 'ava'
import { PID } from './pid'

test('PID is converted to string ', (t) => {
  t.true(`${new PID()}` === 'PID#<0.0.0>')
  t.true(`${new PID()}` === 'PID#<0.1.0>')
  t.true(`${new PID()}` === 'PID#<0.2.0>')
})
