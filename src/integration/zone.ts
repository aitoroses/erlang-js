import { Zone } from '../Zone/Zone'

const zoneB = Zone.current.fork({
  name: 'ZoneB',
  onHandleError: function (parentDelegate, parentZone, targetZone, delegate, args, error) {
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

    new Promise(resolve => {
      // throw Error('What?')
      resolve(2)
    })
    .then((v) => {
      console.log('then ' + 2)
    })
    .catch((e) => {
      console.error(e)
      console.log('catch')
    })

  })
})

// setInterval(() => {}, 1000) // tslint:disable-line
