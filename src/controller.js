/*
 * File: controller.js
 * Project: steam-idler
 * Created Date: 2022-10-17 18:00:31
 * Author: 3urobeat
 *
 * Last Modified: 2024-10-20 18:48:21
 * Modified By: 3urobeat
 *
 * Copyright (c) 2022 - 2024 3urobeat <https://github.com/3urobeat>
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 */


// Handles creating bot objects, providing them with data and relogging
const fs     = require("fs");
const https  = require("https");
const logger = require("output-logger");
const express = require("express"); // Added express
const path = require("path"); // Added path

const config = require("../config.json");

// Export both values to make them accessable from bot.js
module.exports.nextacc    = 0;
module.exports.relogQueue = []; // Queue tracking disconnected accounts to relog them after eachother with a delay

// Configure my logging lib
logger.options({
    msgstructure: `[${logger.Const.ANIMATION}] [${logger.Const.DATE} | ${logger.Const.TYPE}] ${logger.Const.MESSAGE}`,
    paramstructure: [logger.Const.TYPE, logger.Const.MESSAGE, "nodate", "remove", logger.Const.ANIMATION],
    outputfile: "./output.txt",
    exitmessage: "Goodbye!",
    printdebug: false
});


/**
 * Helper function to import login information from accounts.txt
 * @returns {Promise} logininfo object on success, bot is stopped on failure
 */
function importLogininfo() {
    return new Promise((resolve) => {
        logger("info", "Loading logininfo from accounts.txt...");

        let logininfo = {};

        // Import data from accounts.txt
        if (fs.existsSync("./accounts.txt")) {
            let data = fs.readFileSync("./accounts.txt", "utf8").split("\n");

            if (data.length > 0 && data[0].startsWith("//Comment")) data = data.slice(1); // Remove comment from array

            if (data != "") {
                logininfo = {}; // Set empty object

                data.forEach((e) => {
                    if (e.length < 2) return; // If the line is empty ignore it to avoid issues like this: https://github.com/3urobeat/steam-comment-service-bot/issues/80
                    e = e.split(":");
                    e[e.length - 1] = e[e.length - 1].replace("\r", ""); // Remove Windows next line character from last index (which has to be the end of the line)

                    // Format logininfo object and use accountName as key to allow the order to change
                    logininfo[e[0]] = {
                        accountName: e[0],
                        password: e[1],
                        sharedSecret: e[2],
                        steamGuardCode: null
                    };
                });

                logger("info", `Found ${Object.keys(logininfo).length} accounts in accounts.txt, not checking for logininfo.json...`, false, true, logger.animation("loading"));

                return resolve(logininfo);
            } else {
                logger("error", "No accounts found in accounts.txt! Aborting...");
                process.exit(1);
            }
        } else {
            logger("error", "No accounts found in accounts.txt! Aborting...");
            process.exit(1);
        }
    });
}

/**
 * Helper functions to import proxies from proxies.txt
 * @returns {Promise} proxies array on completion
 */
function importProxies() {
    return new Promise((resolve) => {
        let proxies = []; // When the file is just created there can't be proxies in it (this bot doesn't support magic)

        if (!fs.existsSync("./proxies.txt")) {
            resolve([ null ]);
        } else { // File does seem to exist so now we can try and read it
            proxies = fs.readFileSync("./proxies.txt", "utf8").split("\n");
            proxies = proxies.filter(str => str != ""); // Remove empty lines

            if (proxies.length > 0 && proxies[0].startsWith("//Comment")) proxies = proxies.slice(1); // Remove comment from array

            if (config.useLocalIP) proxies.unshift(null); // Add no proxy (local ip) if useLocalIP is true

            // Check if no proxies were found (can only be the case when useLocalIP is false)
            if (proxies.length == 0) {
                logger("", "", true);
                logger("error", "useLocalIP is turned off in config.json but I couldn't find any proxies in proxies.txt!\n        Aborting as I don't have at least one IP to log in with!", true);
                return process.exit();
            }
        }

        resolve(proxies);
    });
}

/**
 * Checks if an update is available from the GitHub repository and logs a message
 */
function checkForUpdate() {
    logger("info", "Checking for an available update...", false, true, logger.animation("loading"));

    let output = "";

    try {
        const localVersion = require("../package.json").version;

        const req = https.get("https://raw.githubusercontent.com/3urobeat/steam-idler/main/package.json", function(res) {
            res.setEncoding("utf8");

            res.on("data", (chunk) => {
                output += chunk;
            });

            res.on("end", () => {
                output = JSON.parse(output);
                const onlineVersion = output.version;

                if (onlineVersion && onlineVersion != localVersion) {
                    logger("", `${logger.colors.fggreen}Update available!${logger.colors.reset} Your version: ${logger.colors.fgred}${localVersion}${logger.colors.reset} | New version: ${logger.colors.fggreen}${onlineVersion}`, true);
                    logger("", "", true);
                    logger("", `Download it here and transfer your accounts.txt, config.json & proxies.txt:\n${logger.colors.fgcyan}${logger.colors.underscore}https://github.com/3urobeat/steam-idler/archive/refs/heads/main.zip`, true);
                    logger("", "", true);
                }
            });
        });

        req.on("error", function(err) {
            logger("warn", `${logger.colors.reset}[${logger.colors.fgred}Notice${logger.colors.reset}]: Couldn't check for an available update because either GitHub is down or your internet isn't working.\n          Error: ${err}`, true);
        });
    } catch (err) {
        logger("error", "Failed to check for an update: " + err, true);
    }
}


/* ------------ Login all accounts ------------ */
const allBots = [];

module.exports.start = async () => {
    global.logger = logger; // Make logger accessible from everywhere in this project

    logger("", "", true, true);
    logger("info", "steam-idler by 3urobeat v1.10\n");

    // Check for an update
    checkForUpdate();

    // Call helper function to import logininfo
    const logininfo = await importLogininfo();

    // Call helper function to import proxies
    const proxies = await importProxies();

    // Start creating a bot object for each account
    logger("", "", true);

    // Setup Express Dashboard
    const dashboardPort = config.dashboardPort || 3000;
    const app = express();

    app.use(express.json()); // Middleware to parse JSON bodies

    app.use(express.static(path.join(__dirname, 'dashboard/dist')));

    app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard/dist/index.html'));
    });

    // app.get("/", (req, res) => {
    //     res.send("Dashboard backend is running!");
    // });
    app.get("api/ping", (req, res) => {
        res.json({ message: "pong" });
    });

    app.get("/api/status", (req, res) => {
        const botsStatus = allBots.map(bot => {
            return {
                accountName: bot.logOnOptions ? bot.logOnOptions.accountName : null,
                playedAppIDs: bot.playedAppIDs || [],
                startedPlayingTimestamp: bot.startedPlayingTimestamp || null,
                proxy: bot.proxy || null,
                isBotRunning: !!(bot.client && bot.client.steamID) // Ensure boolean
            };
        });
        res.json(botsStatus);
    });

    app.get("/api/logs", (req, res) => {
        fs.readFile("./output.txt", "utf8", (err, data) => {
            if (err) {
                logger("error", `Error reading output.txt for /api/logs: ${err.message}`);
                res.status(500).send("Error reading log file.");
                return;
            }
            res.set("Content-Type", "text/plain");
            res.send(data);
        });
    });

    app.get("/api/steam/owned_games", async (req, res) => {
        const { accountName } = req.query;

        if (!accountName) {
            return res.status(400).json({ message: "accountName query parameter is required." });
        }

        // API Key check removed for this endpoint

        const bot = allBots.find(b => b.logOnOptions && b.logOnOptions.accountName === accountName);

        if (!bot) {
            return res.status(404).json({ message: `Bot with accountName '${accountName}' not found.` });
        }

        if (!bot.client || !bot.client.steamID) {
            return res.status(409).json({ message: `Bot '${accountName}' is not currently active or connected to Steam.` });
        }

        // Using bot.client.getUserOwnedApps from steam-user
        bot.client.getUserOwnedApps(bot.client.steamID, { includeAppInfo: true, includePlayedFreeGames: true }, (err, response) => {
            if (err) {
                logger("error", `/api/steam/owned_games: Error from getUserOwnedApps for ${accountName} (SteamID: ${bot.client.steamID}): ${err.message || err}`);
                // EResult codes can be found here: https://github.com/DoctorMcKay/node-steam-user/blob/master/enums/EResult.js
                // Example: EResult.AccessDenied (5) might indicate a private profile
                let statusCode = 500;
                let message = `Error retrieving owned games for '${accountName}'.`;
                if (err.eresult === 5) { // AccessDenied
                    statusCode = 403;
                    message = `Could not retrieve game list for '${accountName}'. The Steam profile might be private. (EResult: ${err.eresult})`;
                } else if (err.eresult) {
                     message = `Error retrieving owned games for '${accountName}'. (EResult: ${err.eresult})`;
                } else {
                    message = `Error retrieving owned games for '${accountName}': ${err.message || 'Unknown error from Steam.'}`;
                }
                return res.status(statusCode).json({ message });
            }

            if (response && response.apps) {
                const ownedGames = response.apps.map(game => ({
                    appid: game.appid,
                    name: game.name,
                    playtime_forever: game.playtime_forever,
                    img_icon_url: (game.img_icon_url
                        ? (game.img_icon_url.startsWith('http')
                            ? game.img_icon_url
                            : `http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`)
                        : null)
                }));
                res.json(ownedGames);
            } else {
                logger("warn", `/api/steam/owned_games: Unexpected response structure from getUserOwnedApps for ${accountName}. SteamID: ${bot.client.steamID}. Response: ${JSON.stringify(response)}`);
                res.status(500).json({ message: "Failed to retrieve owned games due to unexpected response format from Steam." });
            }
        });
    });

    // Endpoint to get current playingGames configuration
    app.get("/api/config/games", (req, res) => {
        fs.readFile("./config.json", "utf8", (err, data) => { // ← 修正
            if (err) {
                if (err.code === 'ENOENT') {
                    logger("error", "/api/config/games: config.json not found.");
                    return res.status(500).json({ message: "Configuration file not found." });
                }
                logger("error", `/api/config/games: Error reading config.json: ${err.message}`);
                return res.status(500).json({ message: "Error reading configuration file." });
            }

            try {
                const currentConfig = JSON.parse(data);
                res.json({ playingGames: typeof currentConfig.playingGames !== 'undefined' ? currentConfig.playingGames : {} });
            } catch (parseErr) {
                logger("error", `/api/config/games: Error parsing config.json: ${parseErr.message}`);
                res.status(500).json({ message: "Error parsing configuration file." });
            }
        });
    });

    // Endpoint to update playingGames configuration
    app.post("/api/config/games", (req, res) => {
        let newPlayingGames = req.body.playingGames;

        // Validate input
        if (typeof newPlayingGames === 'undefined') {
            return res.status(400).json({ message: "Missing 'playingGames' in request body." });
        }
        if (!Array.isArray(newPlayingGames) && (typeof newPlayingGames !== 'object' || newPlayingGames === null)) {
            return res.status(400).json({ message: "'playingGames' must be an array or an object." });
        }

        // config.jsonの絶対パスを取得
        const configPath = path.resolve(__dirname, "../config.json");

        fs.readFile(configPath, "utf8", (err, data) => {
            if (err) {
                logger("error", `/api/config/games (POST): Error reading config.json: ${err.message}`);
                return res.status(500).json({ message: "Error reading configuration file before update." });
            }

            let currentConfig;
            try {
                currentConfig = JSON.parse(data);
            } catch (parseErr) {
                logger("error", `/api/config/games (POST): Error parsing config.json: ${parseErr.message}`);
                return res.status(500).json({ message: "Error parsing configuration file before update." });
            }

            // --- ここから修正 ---
            // playingGamesが配列なら全アカウントに同じ値をセット
            if (Array.isArray(newPlayingGames)) {
                // accounts.txtからアカウント名一覧を取得
                let accountNames = [];
                if (fs.existsSync("./accounts.txt")) {
                    let lines = fs.readFileSync("./accounts.txt", "utf8").split("\n");
                    if (lines.length > 0 && lines[0].startsWith("//Comment")) lines = lines.slice(1);
                    accountNames = lines
                        .map(line => line.split(":")[0])
                        .filter(name => name && name.length > 0);
                }
                const obj = {};
                accountNames.forEach(acc => { obj[acc] = [...newPlayingGames]; });
                newPlayingGames = obj;
            }
            // --- ここまで修正 ---

            // Update the configuration
            currentConfig.playingGames = newPlayingGames;

            fs.writeFile(configPath, JSON.stringify(currentConfig, null, 4), "utf8", (writeErr) => {
                if (writeErr) {
                    logger("error", `/api/config/games (POST): Error writing config.json: ${writeErr.message}`);
                    return res.status(500).json({ message: "Error writing updated configuration file." });
                }

                logger("info", `Successfully wrote config.json at ${configPath}`);

                // Apply changes to running bots
                let botsUpdatedCount = 0;
                allBots.forEach(bot => {
                    if (bot.client && bot.client.steamID) {
                        let gamesForThisBot = [];
                        if (typeof newPlayingGames === 'object' && newPlayingGames !== null) {
                            if (bot.logOnOptions && newPlayingGames[bot.logOnOptions.accountName]) {
                                gamesForThisBot = newPlayingGames[bot.logOnOptions.accountName];
                                if (!Array.isArray(gamesForThisBot)) {
                                    logger("warn", `Configuration for bot ${bot.logOnOptions.accountName} in newPlayingGames is not an array. Skipping update for this bot.`);
                                    return;
                                }
                            } else {
                                logger("info", `Bot ${bot.logOnOptions.accountName} has no specific game configuration in the new object structure. It will play no games unless a default is set.`);
                            }
                        }
                        try {
                            bot.client.gamesPlayed(gamesForThisBot);
                            bot.playedAppIDs = [...gamesForThisBot];
                            bot.startedPlayingTimestamp = Date.now();
                            logger("info", `Updated games for bot ${bot.logOnOptions.accountName} to: ${JSON.stringify(gamesForThisBot)}`);
                            botsUpdatedCount++;
                        } catch (e) {
                            logger("error", `Failed to update games for bot ${bot.logOnOptions.accountName}: ${e.message}`);
                        }
                    }
                });

                res.json({
                    message: "Configuration updated successfully.",
                    botsAttempted: allBots.filter(b => b.client && b.client.steamID).length,
                    botsSuccessfullyUpdated: botsUpdatedCount
                });
            });
        });
    });

    // アカウント一覧API
    app.get("/api/accounts", (req, res) => {
        // accounts.txtからアカウント名一覧を返す
        if (fs.existsSync("./accounts.txt")) {
            let data = fs.readFileSync("./accounts.txt", "utf8").split("\n");
            if (data.length > 0 && data[0].startsWith("//Comment")) data = data.slice(1);
            const accounts = data
                .map(line => line.split(":")[0])
                .filter(name => name && name.length > 0);
            res.json(accounts);
        } else {
            res.status(404).json({ message: "accounts.txt not found." });
        }
    });

    app.listen(dashboardPort, () => {
        logger("info", `Dashboard server listening on port ${dashboardPort}`);
    });

    Object.values(logininfo).forEach((e, i) => {
        setTimeout(() => {

            const readycheckinterval = setInterval(() => {
                if (this.nextacc == i) { // Check if it is our turn
                    clearInterval(readycheckinterval);

                    // Create new bot object
                    const botfile = require("./bot.js");
                    const bot = new botfile(e, i, proxies);

                    bot.login();

                    allBots.push(bot);
                }
            }, 250);

        }, 1000);
    });
};

// Log playtime for all accounts on exit
process.on("exit", () => {
    allBots.forEach((e) => e.logPlaytimeToFile());
});
