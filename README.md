# TwitchBotAverage

Bot Twitch permettant de lancer une session de vote dans le chat et de calculer une moyenne.

## Prerequis

- Node.js (version LTS recommandee)
- Git

Verification rapide dans un terminal:

```bash
node -v
git -v
```

Si une commande echoue juste apres installation, ferme puis reouvre le terminal et reteste.

## Installation

Clone le depot puis installe les dependances:

```bash
git clone https://github.com/Lucixxe/TwitchBotAverage.git
cd TwitchBotAverage
npm install
```

## Configuration

1. Cree un fichier `.env` a la racine du projet (ou modifie-le s'il existe deja).
2. Renseigne les variables suivantes:

```env
TWITCH_CHANNEL=nom_de_ta_chaine
TWITCH_OAUTH=oauth:ton_access_token
```

Pour generer le token Twitch, utilise un generateur de token OAuth Twitch et recupere un **access token**.

## Lancer le bot

Depuis le dossier du projet:

```bash
node main.js
```

Le bot se connecte au chat de la chaine configuree et attend les commandes.

## Utilisation

Commande de demarrage d'un vote:

```text
!note [timer] [max]
```

- `timer`: duree du vote en secondes
- `max`: note maximale autorisee

Exemple:

```text
!note 120 20
```

Pendant le vote, les viewers envoient simplement une note numerique dans le chat.
Seul le premier vote de chaque utilisateur est pris en compte.

## Resultats et logs

En fin de vote, le bot publie la moyenne dans le chat.
Dans les logs, tu retrouveras aussi des details complementaires comme:

- note minimale et maximale
- ecart-type
- votes ignores (double vote ou format invalide)

## Mise a jour

Si tu as clone le projet avec Git, mets-le a jour avec:

```bash
git pull
```