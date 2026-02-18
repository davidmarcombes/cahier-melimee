/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("identity_collection")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "identity_gender",
    "name": "gender",
    "type": "select",
    "required": true,
    "presentable": true,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "M",
        "F"
      ]
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("identity_collection")

  // remove
  collection.schema.removeField("identity_gender")

  return dao.saveCollection(collection)
})
