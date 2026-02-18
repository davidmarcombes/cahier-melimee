/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "pupils_collection",
    "created": "2026-02-16 14:28:30.269Z",
    "updated": "2026-02-16 14:28:30.269Z",
    "name": "pupils",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "user_username",
        "name": "username",
        "type": "text",
        "required": true,
        "presentable": true,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "user_sticker_id",
        "name": "sticker_id",
        "type": "text",
        "required": true,
        "presentable": true,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "user_visual_key",
        "name": "visual_key",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "user_slug",
        "name": "slug",
        "type": "text",
        "required": true,
        "presentable": true,
        "unique": true,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_slug` ON `pupils` (`slug`)"
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("pupils_collection");

  return dao.deleteCollection(collection);
})
