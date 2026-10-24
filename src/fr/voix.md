---
layout: page
title: "La voix du Cahier"
lang: fr
locale: fr-FR
templateEngineOverride: njk,md
---

Certains exercices utilisent des consignes vocales : grande section, dictées et écoutes de nombres, comptage d'objets en CP.

## Clips audio préenregistrés

Les consignes de grande section, les dictées et écoutes de nombres, le comptage d'objets en CP et les encouragements utilisent des clips préenregistrés par le Cahier (voix Piper française SIWIS). Le lecteur compose les grands nombres et les décimaux à partir de clips de groupes de chiffres, d'unités et de virgule. Les 16 consignes d'objets et les retours (« Bravo ! », « Super ! »…) sont partagés entre exercices.

### Comment les clips sont fabriqués

Le Cahier transforme les consignes et les briques de nombres en fichiers audio avec **Piper**, un générateur vocal libre exécuté hors ligne. Les fichiers obtenus sont publiés avec le site, puis téléchargés seulement lorsqu'un exercice les lit. La voix ne génère donc rien sur l'appareil et les textes des exercices ne sont pas envoyés à un service de synthèse.

La voix SIWIS a été entraînée à partir du jeu de données [SIWIS French Speech Synthesis Database](https://datashare.is.ed.ac.uk/handle/10283/2353), sous licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Écoute un nombre et un encouragement :

<p>Dictée — nombre treize</p>
<audio controls preload="none" src="{{ '/assets/audio/voice-pilot/nombres/13.ogg' | url }}">Écouter « treize »</audio>

<p>Compter — souris</p>
<audio controls preload="none" src="{{ '/assets/audio/voice-pilot/objets/souris.ogg' | url }}">Écouter la consigne</audio>

<p>Encouragement — bravo</p>
<audio controls preload="none" src="{{ '/assets/audio/voice-pilot/feedback/bravo.ogg' | url }}">Écouter « Bravo ! »</audio>

<p><a href="{{ '/fr/applications/cf92b76d/' | url }}">Essayer une dictée de grands nombres composés</a></p>

Les fichiers sont téléchargés uniquement quand un son est lu. Aucun texte n'est transmis à un fournisseur vocal. Le navigateur ne synthétise pas la voix : si un clip manque ou ne peut pas être lu, un message d'erreur s'affiche. Les énoncés généraux des exercices ne sont pas lus à voix haute.
