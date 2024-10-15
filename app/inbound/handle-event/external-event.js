const { v4: uuidv4 } = require('uuid')
const { createRow } = require('./create-row')
const { EXTERNAL_EVENT } = require('../../constants/event-types')
const { getClient } = require('../../storage')
const { createIfNotExists } = require('./create-if-not-exists')

const createUserEntity = (event) => {
  const payload = JSON.parse(event.data?.message)
  const { actioningUser } = payload
  return createRow(`user_${actioningUser?.username}`, uuidv4(), EXTERNAL_EVENT, event)
}

const createDogEntity = (pk, event) => {
  return createRow(`dog_${pk}`, uuidv4(), EXTERNAL_EVENT, event)
}

const createOwnerEntity = (pk, event) => {
  return createRow(`owner_${pk}`, uuidv4(), EXTERNAL_EVENT, event)
}

const createDateEntity = (event) => {
  return createRow(`date_${new Date().getTime()}`, uuidv4(), EXTERNAL_EVENT, event)
}

const createSearchEntity = (term, event) => {
  return createRow(`search_${term.toLowerCase()}`, `${new Date().getTime()}_${uuidv4()}`, EXTERNAL_EVENT, event)
}

const createSearchEntities = (event) => {
  const payload = JSON.parse(event.data?.message)
  const { details } = payload
  const entitiesList = details?.searchTerms.split(' ').map((term) => {
    return createSearchEntity(term, event)
  })
  entitiesList.push(createUserEntity(event))
  entitiesList.push(createDateEntity(event))
  return entitiesList
}

const saveExternalEvent = async (eventWithPk) => {
  const origPk = eventWithPk.partitionKey
  const event = { ...eventWithPk }
  delete event.partitionKey

  const client = await getClient(EXTERNAL_EVENT)

  if (event.type?.endsWith('.external.view.owner')) {
    await createIfNotExists(client, createUserEntity(event))
    await createIfNotExists(client, createOwnerEntity(origPk, event))
    await createIfNotExists(client, createDateEntity(event))
  } else if (event.type?.endsWith('.external.view.dog')) {
    await createIfNotExists(client, createUserEntity(event))
    await createIfNotExists(client, createDogEntity(origPk, event))
    await createIfNotExists(client, createDateEntity(event))
  } else if (event.type?.endsWith('.external.search')) {
    const entities = createSearchEntities(event)
    for (const entity of entities) {
      await createIfNotExists(client, entity)
    }
  }
}

module.exports = {
  saveExternalEvent
}

/*
- [ ] Pk ‘user_’ + username + action (login/logout/dogview/personview/search), rowkey timestamp + guid??
- [ ] Pk ‘dog_’ + dogId, rowkey timestamp +  guid
- [ ] Pk ‘owner_’ + personId, rowkey timestamp + guid
- [ ] Pk search term, ?? Pk ‘search_’ + single term, rowkey timestamp
- [ ] Pk ‘date_’ + timestamp + guid, rowkey action (login/logout/dogview/personview/search)
*/
