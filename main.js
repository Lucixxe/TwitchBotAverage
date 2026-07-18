const express = require('express');
const tmi = require('tmi.js');
const app = express();
const PORT = process.env.PORT || 3000;

// Import Node's built-in HTTPS module to send the final results to Wizebot
const https = require('https');

// Safely retrieve the Twitch channel name from environment variables (default to 'lucixxe' if missing)
const twitchChannel = process.env.TWITCH_CHANNEL || 'lucixxe';

// TMI.JS CONFIGURATION (Anonymous read-only connection, no password needed)
const client = new tmi.Client({
    options: { debug: false },
    channels: [ twitchChannel ] // Dynamically joins the channel defined in your environment variables
});
client.connect().catch(console.error);

// Global variables to manage the voting session state
let voteActif = false;
let noteMax = 20;
let votes = {}; // Stores votes in the format { 'username': score }

// Listen to incoming messages in the Twitch chat
client.on('message', (channel, tags, message, self) => {
    if (!voteActif) return;
    
    const pseudo = tags['display-name'];
    const texte = message.trim().replace(',', '.'); // Replace comma with dot for decimal numbers
    const note = parseFloat(texte);

    // Validate if it's a number, within the allowed range, and the user's first vote
    if (!isNaN(note) && note >= 0 && note <= noteMax) {
        if (!votes[pseudo]) {
            votes[pseudo] = note; // Only the first submission is recorded
        }
    }
});

// Endpoint triggered by Wizebot's custom API call at the start of a vote
app.get('/api/note', (req, res) => {
    const argString = req.query.args || ""; 
    const args = argString.split(' ');
    
    const temps = parseInt(args[0]); // Extracted timer duration in seconds
    const max = parseInt(args[1]);   // Extracted maximum allowed score

    // Input validation for arguments
    if (isNaN(temps) || isNaN(max)) {
        return res.send("Erreur format: !note [timer] [max]. Exemple : !note 120 20");
    }

    // Prevent overlapping voting sessions
    if (voteActif) {
        return res.send("⚠️ Un vote est déjà en cours ! Veuillez patienter.");
    }

    // Initialize the voting session parameters
    voteActif = true;
    noteMax = max;
    votes = {};

    // 1. Respond INSTANTLY to Wizebot to confirm the start and avoid connection timeout
    res.send(`📢 Le vote est ouvert pour ${temps} secondes ! Envoyez votre note entre 0 et ${max} dans le chat (Seul votre premier vote compte).`);

    // 2. Start the countdown timer as a background task on Render
    setTimeout(() => {
        voteActif = false;
        const pseudosVotants = Object.keys(votes);
        const nombreDeVotes = pseudosVotants.length;
        let messageFinal = "";

        if (nombreDeVotes === 0) {
            messageFinal = "Le vote est terminé ! Personne n'a voté, c'est quoi ces humains ?";
        } else {
            // Calculate the sum and the average score
            let somme = 0;
            for (let user of pseudosVotants) {
                somme += votes[user];
            }
            const moyenne = (somme / nombreDeVotes).toFixed(2);
            messageFinal = `Le vote est terminé ! ${nombreDeVotes} votant(s). La moyenne est de : ${moyenne} / ${noteMax}`;
        }

        // 3. Send the final results back to Wizebot via Push API to post it in the chat
        envoyerPushWizebot(messageFinal);

    }, temps * 1000);
});

// Function to send a Push Notification request to Wizebot
function envoyerPushWizebot(texteAEnvoyer) {
    // Safely retrieve credentials from Render's Environment Variables
    const apiKey = process.env.WIZEBOT_API_KEY; 
    const apiAccount = process.env.WIZEBOT_ACCOUNT;
    
    // Safety check in case environment variables are missing
    if (!apiKey || !apiAccount) {
        console.error("[Wizebot Push] Erreur : Les variables d'environnement ne sont pas configurées !");
        return;
    }

    // Build the official Wizebot API URL using query parameters
    const url = `https://wizebot.tv/api/push/${apiKey}/${apiAccount}/chat?message=${encodeURIComponent(texteAEnvoyer)}`;

    // Perform the HTTP GET request to Wizebot's servers
    https.get(url, (response) => {
        console.log(`[Wizebot Push] Message envoyé. Statut: ${response.statusCode}`);
    }).on('error', (e) => {
        console.error(`[Wizebot Push] Erreur: ${e.message}`);
    });
}

app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));