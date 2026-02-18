/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("identity_collection")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "identity_usage_count",
    "name": "usage_count",
    "type": "number",
    "required": false,
    "presentable": true,
    "unique": false,
    "options": {
      "min": 0,
      "max": null,
      "noDecimal": true
    }
  }))

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "identity_max_usage",
    "name": "max_usage",
    "type": "number",
    "required": false,
    "presentable": true,
    "unique": false,
    "options": {
      "min": 1,
      "max": null,
      "noDecimal": true
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("identity_collection")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "identity_usage_count",
    "name": "usage_count",
    "type": "number",
    "required": true,
    "presentable": true,
    "unique": false,
    "options": {
      "min": 0,
      "max": null,
      "noDecimal": true
    }
  }))

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "identity_max_usage",
    "name": "max_usage",
    "type": "number",
    "required": true,
    "presentable": true,
    "unique": false,
    "options": {
      "min": 1,
      "max": null,
      "noDecimal": true
    }
  }))

  return dao.saveCollection(collection)
})
