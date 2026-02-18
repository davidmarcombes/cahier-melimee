/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "identity_collection",
    "created": "2026-02-16 14:33:33.915Z",
    "updated": "2026-02-16 14:33:33.915Z",
    "name": "identities",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "identity_name",
        "name": "name",
        "type": "text",
        "required": true,
        "presentable": true,
        "unique": true,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
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
      },
      {
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
      }
    ],
    "indexes": [],
    "listRule": "",
    "viewRule": "",
    "createRule": null,
    "updateRule": "",
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("identity_collection");

  return dao.deleteCollection(collection);
})
