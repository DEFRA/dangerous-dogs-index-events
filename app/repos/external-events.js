const { EXTERNAL_EVENT } = require('../constants/event-types')
const { getClient } = require('../storage')
const { constructSearchFilter, constructDateFilter, constructViewDogFilter, constructViewOwnerFilter, constructUserFilter } = require('./external-events-query-builder')

const getExternalEvents = async (queryType, pks, fromDate, toDate) => {
  try {
    const client = getClient(EXTERNAL_EVENT)

    let filterText
    if (queryType === 'search') {
      filterText = constructSearchFilter(pks, fromDate, toDate)
    } else if (queryType === 'date') {
      filterText = constructDateFilter(pks, fromDate, toDate)
    } else if (queryType === 'viewDog') {
      filterText = constructViewDogFilter(pks, fromDate, toDate)
    } else if (queryType === 'viewOwner') {
      filterText = constructViewOwnerFilter(pks, fromDate, toDate)
    } else if (queryType === 'user') {
      filterText = constructUserFilter(pks, fromDate, toDate)
    }

    const entities = client.listEntities({
      queryOptions: { filter: `${filterText}` }
    })

    const results = []
    for await (const entity of entities) {
      results.push(mapEntity(entity))
    }

    return results
  } catch (err) {
    console.log('Error getting external events', err.message)
    throw err
  }
}

const mapEntity = (entity) => {
  const data = JSON.parse(entity.data)
  const message = JSON.parse(data.message)
  const username = message.actioningUser?.username

  message.username = username
  message.timestamp = entity.time
  message.type = entity.type
  message.rowKey = entity.rowKey
  message.partitonKey = entity.partitionKey

  return message
}

module.exports = {
  getExternalEvents
}
