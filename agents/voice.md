# Voix préenregistrée

## Objectif

Servir uniquement des clips audio statiques, réutilisables et téléchargés au moment de la lecture. Aucun mécanisme de repli côté navigateur ni synthèse vocale en ligne.

## Voix et réglages

- Synthèse hors ligne avec Piper, modèle français `fr_FR-siwis-medium`.
- Consignes GS, nombres, consignes de comptage et segments de nombres : `lengthScale: 1.2` (lecture ralentie).
- Encouragements : `lengthScale: 1.0` (vitesse normale).
- Encodage : Ogg Opus mono, 24 kHz, 20 kbit/s.
- Jeu de données SIWIS : [SIWIS French Speech Synthesis Database](https://datashare.is.ed.ac.uk/handle/10283/2353), licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Garder l'attribution de [la page voix](../src/fr/voix.md) à jour.

## Générer ou régénérer

```bash
uv run --with piper-tts --with imageio-ffmpeg npm run generate:voice-pilot
```

`uv` fournit Piper et `imageio-ffmpeg` dans son cache, sans installation système ni dépendance ajoutée au dépôt. `imageio-ffmpeg` fournit ffmpeg si aucun binaire système n'est dans le `PATH`. Le premier lancement télécharge le modèle, environ 63 Mo, dans `~/.cache/melimee/piper/fr_FR-siwis-medium`. `PIPER_MODEL_DIR` permet de choisir un autre cache.

Le modèle et sa configuration sont épinglés à une révision Hugging Face et vérifiés par SHA-256 dans `scripts/synthesize-piper.py`. Ne pas enlever ces vérifications ni remplacer le modèle sans mettre à jour les empreintes et vérifier l'attribution/licence.

## Sources des phrases et fichiers produits

`scripts/generate-voice-pilot.js` :

- Lit le champ `say` des métadonnées YAML des exercices et applications GS.
- Si GS `say` est absent, utilise le titre comme consigne parlée.
- Normalise les espaces et supprime les phrases en double; le nom de chaque clip d'instruction est dérivé de son SHA-256.
- Génère les clips numériques 0–999, plus le clip « mille » (1 000). Les dictées composent les nombres jusqu'à 999 999 999 avec clips de groupes (`millions`, `mille`, unités); les décimaux ajoutent « virgule » et lisent chaque chiffre.
- Génère un clip pour chacun des 16 types d'objets du générateur CP `compterObjets`.
- Ajoute les segments « mille », « million(s) », « virgule ».
- Ajoute six phrases de feedback communes.
- Envoie la liste à Piper avec la vitesse de chaque catégorie et écrit `instructions.json`.

`scripts/synthesize-piper.py` télécharge/vérifie le modèle, produit les WAV temporaires, puis les encode en Opus. Les sources génératrices sont les scripts et les données d'exercices; ne pas modifier manuellement les fichiers générés.

Sortie : `src/assets/audio/voice-pilot/`

- `instructions/<hash>.ogg` : consignes GS uniques.
- `instructions.json` : phrase vers chemin de clip; consommé au build par `.eleventy.js`.
- `nombres/0.ogg` à `nombres/999.ogg` : briques de composition pour dictées et écoutes; `nombres/1000.ogg` : « mille ».
- `unites/*.ogg` : mots de liaison pour nombres composés et décimaux.
- `objets/*.ogg` : consignes pour les 16 types d'objets CP.
- `feedback/*.ogg` : encouragements communs.

Après génération, contrôler `git status` et la taille des assets pour détecter les fichiers obsolètes ou inattendus; le générateur ne doit pas entraîner l'ajout du modèle Piper au dépôt.

## Lecture dans le site

- `.eleventy.js` charge le manifeste et inclut les chemins d'instructions dans les exercices statiques correspondants.
- `src/assets/js/modules/player.js` lit les clips d'instructions et de retour, y compris les segments en séquence; aucune synthèse vocale navigateur ni mécanisme de repli en ligne.
- `src/assets/js/generators/numeration.js` compose clips de nombres et chiffres décimaux.
- `src/assets/js/generators/nombres.js` attache une consigne audio aux 16 types CP de comptage d'objets.
- Les clips ne sont pas inclus dans le cache initial du service worker. La lecture crée une requête audio à la demande, ensuite mise en cache par le service worker.
- La page publique [src/fr/voix.md](../src/fr/voix.md) décrit l'expérience, la vie privée, l'attribution et donne des exemples d'écoute.

Ne pas envoyer les phrases à un service de synthèse en ligne lors de la génération. Les fichiers audio livrés sont publics; ne jamais y inclure de données personnelles.

## Vérification après changement

- `npm test -- tests/generators.test.js` pour les générateurs numériques.
- `npm run test:e2e -- --grep "voice|dictée|compter"` si le séquencement de lecture change.
- `npm run validate:exercises` si les données d'exercices ont changé.
- `npm run build` pour vérifier l'intégration Eleventy et HTML.
- Écouter les exemples sur `/fr/voix/` et vérifier dans le navigateur que chaque clip d'une dictée composée se charge; une panne doit afficher le message d'erreur, sans mécanisme de repli vocal.

Pour une modification d'inventaire, de chemins ou de vitesse, mettre à jour scripts, fichiers générés et tests/pages concernés ensemble. N'ajouter aucune lecture générale de titre/énoncé ni aucun mécanisme de repli `speechSynthesis`.
