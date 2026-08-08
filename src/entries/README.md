# src/entries — obsolète

Ces quatre entrées (`core.ts`, `mobile.ts`, `main.ts`, `main-noedit.ts`)
découpaient le bundle en morceaux de moins de 128 Ko, la limite d'une
**ressource Lovelace inline**. Elles ne servent plus.

Deux raisons de les abandonner :

1. Même sans les éditeurs de cartes, le paquet des cartes principales pèse
   168 Ko : aucun découpage à deux ne tient sans dupliquer Lit dans chaque
   morceau et sans risquer qu'un même élément soit défini deux fois (le
   premier chargé gagne, les autres sont ignorés silencieusement).
2. Surtout, **pousser une ressource inline volumineuse est impossible par
   l'API** : la connexion se coupe au-delà de quelques dizaines de Ko de
   contenu, même en version compressée (voir `scripts/pack-inline.mjs`).

## Méthode retenue

Un seul fichier servi depuis le dossier `www` de Home Assistant :

```bash
npm run build                       # → dist/acd-cards.js
cp dist/acd-cards.js <config-ha>/www/acd-cards.js
```

Puis, dans Paramètres → Tableaux de bord → ⋮ → Ressources, une seule entrée :

```
/local/acd-cards.js?v=0.16.0
```

Aucune limite de taille, un seul artefact, et le paramètre `?v=` casse le
cache du navigateur à chaque livraison. `scripts/pack-inline.mjs` reste
disponible si l'inline redevient nécessaire un jour, mais son contenu doit
alors être collé à la main dans l'interface de Home Assistant.

Ces fichiers sont conservés faute de pouvoir les supprimer depuis
l'environnement d'édition ; ils peuvent être effacés sans conséquence.
