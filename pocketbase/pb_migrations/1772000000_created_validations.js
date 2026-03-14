/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const collection = new Collection({
      id: 'validations_col',
      created: '2026-03-03 16:00:00.000Z',
      updated: '2026-03-03 16:00:00.000Z',
      name: 'validations',
      type: 'base',
      system: false,
      schema: [
        {
          system: false,
          id: 'val_series_id',
          name: 'series_id',
          type: 'text',
          required: true,
          presentable: true,
          unique: false,
          options: { min: null, max: null, pattern: '' },
        },
        {
          system: false,
          id: 'val_tester',
          name: 'tester',
          type: 'text',
          required: true,
          presentable: true,
          unique: false,
          options: { min: null, max: null, pattern: '' },
        },
        {
          system: false,
          id: 'val_exercise_flags',
          name: 'exercise_flags',
          type: 'json',
          required: false,
          presentable: false,
          unique: false,
          options: {},
        },
        {
          system: false,
          id: 'val_notes',
          name: 'notes',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: null, pattern: '' },
        },
      ],
      indexes: [],
      listRule: null,
      viewRule: null,
      createRule: '',
      updateRule: null,
      deleteRule: null,
      options: {},
    });

    return Dao(db).saveCollection(collection);
  },
  (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId('validations_col');
    return dao.deleteCollection(collection);
  }
);
