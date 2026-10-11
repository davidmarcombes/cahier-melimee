---
layout: page
title: "La voix du Cahier"
lang: fr
locale: fr-FR
templateEngineOverride: njk,md
---

Certains exercices parlent : ceux de grande section et les dictées de nombres. Ailleurs, le bouton 🔊 à côté d'un titre lit l'énoncé, et le bouton haut-parleur en haut de la page fait lire tous les énoncés automatiquement.

{% include "components/voice-status.njk" %}

## Par défaut : une voix installée sur l'appareil

Le Cahier utilise **une voix installée sur ton appareil**. Elle fonctionne sans Internet, et **le texte lu ne quitte jamais l'appareil**. C'est ce que nous recommandons.

Les noms des menus changent un peu d'une version à l'autre.

- **Windows 10 et 11** : Paramètres → Heure et langue → Voix (ou Synthèse vocale) → Ajouter des voix → Français (France). Puis redémarre le navigateur.
- **Mac** : Réglages Système → Accessibilité → Contenu énoncé → Voix du système → Gérer les voix… → Français (par exemple Thomas ou Amélie).
- **iPad et iPhone** : Réglages → Accessibilité → Contenu énoncé → Voix → Français.
- **Android** : Paramètres → Accessibilité → Synthèse vocale → moteur « Services vocaux Google » → ⚙️ → Installer les données vocales → Français (France).
- **Chromebook** : Paramètres → Accessibilité → Synthèse vocale → Voix → choisis une voix française.
- **Linux** : installe `speech-dispatcher` et une voix française (par exemple `espeak-ng`, ou une voix plus naturelle comme Piper ou RHVoice), puis utilise Firefox ou Chromium.

Ensuite, **recharge la page** : la voix apparaît dans la liste ci-dessus avec ✅.

## Si tu ne peux pas installer de voix : une voix en ligne

Certains navigateurs proposent des voix « en ligne » (🌐 dans la liste), par exemple « Google français » dans Chrome. Elles sont souvent de bonne qualité, mais elles fonctionnent autrement :

- **les phrases à lire sont envoyées par le navigateur à son fournisseur** (Google pour Chrome, Microsoft pour Edge…), qui les transforme en son ;
- ce fournisseur voit donc ces phrases (consignes, énoncés, nombres des dictées) et l'adresse Internet de l'appareil ;
- le Cahier, lui, n'envoie rien : ni le nom du cahier, ni la progression. Mais il ne contrôle pas ce que fait le fournisseur.

**Pour un enfant, c'est à un adulte de choisir.** Le choix est gardé dans le cahier, et tu peux le retirer à tout moment en décochant la case. Dès qu'une voix est installée, c'est elle qui parle, même si la case est cochée.

{% include "components/voix-en-ligne.njk" %}

Sans voix, les exercices restent jouables sans le son. Les dictées, elles, ont besoin d'une voix.
