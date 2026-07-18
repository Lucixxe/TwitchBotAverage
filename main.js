require('dotenv').config();

const tmi = require('tmi.js');

const twitchChannel = process.env.TWITCH_CHANNEL || 'lucixxe';
const oauthToken = process.env.TWITCH_OAUTH || 'oauth:TOKEN'; // Generate your OAuth token at https://twitchtokengenerator.com/

// TMI.JS CONFIGURATION (Authenticated connection to read and write)
const client = new tmi.Client({
    options: { debug: false },
    identity: {
        username: twitchChannel,
        password: oauthToken // Your generated OAuth token
    },
    channels: [ twitchChannel ]
});
client.connect().catch(console.error);

// Global variables to manage the voting session state
let voteActif = false;
let noteMax = 20;
let votes = {}; // Stores votes in the format { 'username': score }

// Listen to incoming messages in the Twitch chat
client.on('message', (channel, tags, message, self) => {
    // Ignore messages sent by the bot itself to prevent infinite loops
    if (self) return;

    const cleanMessage = message.trim();
    const username = tags['username'];
    const displayName = tags['display-name'];

    // 1. TRIGGER: Check if a streamer or mod starts a vote via "!note [timer] [max]"
    if (cleanMessage.startsWith('!note')) {
        // Only allow the broadcaster (streamer) or moderators to start a vote
        const isMod = tags.mod || tags.badges?.broadcaster;
        if (!isMod) return;

        const args = cleanMessage.split(' ').slice(1);
        const temps = parseInt(args[0]); // Timer in seconds
        const max = parseInt(args[1]);   // Max score

        // Validation
        if (isNaN(temps) || isNaN(max)) {
            client.say(channel, `⚠️ @${tags['display-name']} Erreur format: !note [timer] [max]. Exemple : !note 120 20`);
            return;
        }

        if (voteActif) {
            client.say(channel, `⚠️ Un vote est déjà en cours ! Veuillez patienter.`);
            return;
        }

        // Initialize voting state
        voteActif = true;
        noteMax = max;
        votes = {};

        console.log(`\n=== 📢 VOTE STARTED BY ${displayName} (${username}) ===`);
        console.log(`Settings: Duration = ${temps}s, Max Score = ${max}`);
        console.log(`=============================================\n`);

        // Announce the start of the vote
        client.say(channel, `📢 Le vote est ouvert pour ${temps} secondes ! Envoyez votre note entre 0 et ${max} dans le chat (Seul votre premier vote compte).`);

        // Start local background countdown
        setTimeout(() => {
            voteActif = false;
            const pseudosVotants = Object.keys(votes);
            const nombreDeVotes = pseudosVotants.length;

            console.log(`\n=== VOTE FINISHED ===`);
            console.log(`Total unique votes received: ${nombreDeVotes}`);

            if (nombreDeVotes === 0) {
                console.log(`Stats: No votes registered.`);
                console.log(`=======================\n`);
                client.say(channel, "Le vote est terminé ! Personne n'a voté, c'est quoi ces humains ? ");
            } else {
                let somme = 0;
                let noteMin = noteMax;
                let noteMinUser = "";
                let noteMaxReelle = 0;
                let noteMaxUser = "";
                const listNotes = [];

                // Calculate basic stats and find min/max
                for (let user of pseudosVotants) {
                    const currentNote = votes[user];
                    somme += currentNote;
                    listNotes.push(currentNote);

                    if (currentNote < noteMin) {
                        noteMin = currentNote;
                        noteMinUser = user;
                    }
                    if (currentNote >= noteMaxReelle) {
                        noteMaxReelle = currentNote;
                        noteMaxUser = user;
                    }
                }
                
                const moyenne = (somme / nombreDeVotes).toFixed(2);

                // Advanced Stat: Standard Deviation (Écart-type)
                const moyenneNum = somme / nombreDeVotes;
                const variance = listNotes.reduce((acc, val) => acc + Math.pow(val - moyenneNum, 2), 0) / nombreDeVotes;
                const ecartType = Math.sqrt(variance).toFixed(2);

                // Print advanced stats only in console logs
                console.log(`--- Advanced Stats ---`);
                console.log(`• Average (Moyenne): ${moyenne} / ${noteMax}`);
                console.log(`• Lowest Note (Min): ${noteMin} (by ${noteMinUser})`);
                console.log(`• Highest Note (Max): ${noteMaxReelle} (by ${noteMaxUser})`);
                console.log(`• Standard Deviation (Écart-type): ${ecartType}`);
                console.log(`----------------------`);
                console.log(`Full Votes List:`, votes);
                console.log(`=======================\n`);

                client.say(channel, `Le vote est terminé ! ${nombreDeVotes} votant(s). La moyenne est de : ${moyenne} / ${noteMax}`);
            }
        }, temps * 1000);
        
        return; // Stop processing this message as a score entry
    }

    // 2. SCORING PROCESS: Collect scores when a vote session is running
    if (voteActif) {
        const texte = cleanMessage.replace(',', '.');
        const note = parseFloat(texte);

        // Check if the message is a valid score and user hasn't voted yet
        if (!isNaN(note) && note >= 0 && note <= noteMax) {
            const pseudo = tags['display-name'];
            if (!votes[pseudo]) {
                votes[pseudo] = note;
                console.log(`[VOTE SAVED] ${pseudo} (${username}) voted: ${note}`);
            } else {
                console.log(`[VOTE IGNORED] ${pseudo} (${username}) tried to vote again: ${note}`);
            }
        }
    }
});

console.log(`[Local Bot] Application started. Listening to #${twitchChannel}...`);