
import { Zone } from '../Zone'

const zoneB = Zone.current.fork({
  name: 'ZoneB',
  onHandleError: function(parentDelegate, parentZone, targetZone, delegate, args, error) {
    console.log('ZONEDELEGATENOW!!')
    console.error(error)
  }
})

zoneB.run(() => {

  Zone.current.fork({
    name: 'ZoneC',
    onHandleError: (parentDelegate, parentZone, targetZone, delegate, args, error) => {
      parentDelegate.handleError(parentZone, new Error('Forwarded from C to B: ' + error.message))
    }
  }).run(() => {

    new Promise(() => {
      throw Error('What?')
    })
    .then(() => {
      console.log('then')
    })
    .catch((e) => {
      console.error(e)
      console.log('catch')
    })

  })
})

// setInterval(() => {}, 1000) // tslint:disable-line
