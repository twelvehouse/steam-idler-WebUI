<div align="center">
    <h1>steam-idler</h1>
    <h4>Simple cross-platform Steam game idler with multi account support.</h4>
    <div>
        <a href="#install">Install</a> •
        <a href="#accounts">Accounts</a> •
        <a href="#proxies">Proxies</a> •
        <a href="#config">Config</a> •
        <a href="#start">Start</a>
    </div>
    <img src="./.github/img/demo.png"> <!-- https://carbon.now.sh/?bg=rgba%28184%2C233%2C134%2C0%29&t=seti&wt=none&l=text&width=1247&ds=true&dsyoff=11px&dsblur=21px&wc=true&wa=false&pv=56px&ph=56px&ln=false&fl=1&fm=Hack&fs=14px&lh=133%25&si=false&es=2x&wm=false&code=%2524%2520node%2520.%252Fidler.js%250A%255B2023-08-20%252013%253A22%253A54%2520%257C%2520INFO%255D%2520steam-idler%2520by%25203urobeat%2520v1.8%250A%250A%255B2023-08-20%252013%253A22%253A54%2520%257C%2520INFO%255D%2520Loading%2520logininfo%2520from%2520accounts.txt...%250A%250A%255B2023-08-20%252013%253A22%253A55%2520%257C%2520INFO%255D%2520Logging%2520in%25203urobeatsCommentBot2%2520in%25202%2520seconds...%250A%255B2023-08-20%252013%253A22%253A58%2520%257C%2520INFO%255D%2520%255B3urobeatsCommentBot2%255D%2520Logged%2520in%21%2520Checking%2520for%2520missing%2520licenses...%250A%255B2023-08-20%252013%253A22%253A58%2520%257C%2520INFO%255D%2520Logging%2520in%25203urobeatsCommentBot3%2520in%25202%2520seconds...%250A%255B2023-08-20%252013%253A22%253A59%2520%257C%2520INFO%255D%2520%255B3urobeatsCommentBot2%255D%2520Starting%2520to%2520idle%25201%2520games...%250A%255B2023-08-20%252013%253A23%253A01%2520%257C%2520INFO%255D%2520%255B3urobeatsCommentBot3%255D%2520Logged%2520in%21%2520Checking%2520for%2520missing%2520licenses...%250A%255B2023-08-20%252013%253A23%253A01%2520%257C%2520INFO%255D%2520Logging%2520in%25203urobeatsCommentBot4%2520in%25202%2520seconds...%250A%255B2023-08-20%252013%253A23%253A01%2520%257C%2520INFO%255D%2520%255B3urobeatsCommentBot3%255D%2520Requesting%25201%2520missing%2520license%28s%29%2520before%2520starting%2520to%2520play%2520games%2520set%2520in%2520config...%250A%255B2023-08-20%252013%253A23%253A02%2520%257C%2520INFO%255D%2520%255B3urobeatsCommentBot3%255D%2520Successfully%2520requested%25201%2520missing%2520game%2520license%28s%29%21%250A%255B2023-08-20%252013%253A23%253A04%2520%257C%2520INFO%255D%2520%255B3urobeatsCommentBot4%255D%2520Logged%2520in%21%2520Checking%2520for%2520missing%2520licenses...%250A%255B2023-08-20%252013%253A23%253A04%2520%257C%2520INFO%255D%2520Logging%2520in%25203urobeatsCommentBot5%2520in%25202%2520seconds...%250A%255B2023-08-20%252013%253A23%253A04%2520%257C%2520INFO%255D%2520%255B3urobeatsCommentBot4%255D%2520Requesting%25201%2520missing%2520license%28s%29%2520before%2520starting%2520to%2520play%2520games%2520set%2520in%2520config...%250A%255B2023-08-20%252013%253A23%253A05%2520%257C%2520INFO%255D%2520%255B3urobeatsCommentBot4%255D%2520Successfully%2520requested%25201%2520missing%2520game%2520license%28s%29%21%250A%255B2023-08-20%252013%253A23%253A07%2520%257C%2520INFO%255D%2520%255B3urobeatsCommentBot5%255D%2520Logged%2520in%21%2520Checking%2520for%2520missing%2520licenses...%250A%255B2023-08-20%252013%253A23%253A07%2520%257C%2520INFO%255D%2520%255B3urobeatsCommentBot5%255D%2520Starting%2520to%2520idle%25201%2520games... -->
</div>

&nbsp;

## ✨ Introduction
This is a simple cross-platform Steam game idling bot, supporting multiple accounts.  
It handles the connection management for all accounts for you, sends afk messages if enabled and of course idles the configured games.

This project is a slimmed down version of my [steam-comment-service-bot](https://github.com/3urobeat/steam-comment-service-bot), for users only interested in game idling.  
If you need more features, please check it out instead.  
It does way more besides supporting commenting etc, has more advanced connection management features than present here and is updated more regularly.

Please continue reading to learn how to set this bot up.

&nbsp;

## 🚀 Install
## 🚀 Install

Make sure to have [Node.js](https://nodejs.org/) installed.

1. Download this repository as a `.zip` and extract it, or clone it using Git:

    ```bash
    git clone https://github.com/twelvehouse/steam-idler.git
    cd steam-idler
    ```

2. Open a Terminal / PowerShell / Console in the folder.

3. Install all dependencies (this also installs frontend dependencies automatically):

    ```bash
    npm install
    ```

4. Build the web dashboard:

    ```bash
    npm run build
    ```

5. Start the bot:

    ```bash
    npm start
    ```

The dashboard will be available at `http://localhost:3000`  
(or the port defined in your `config.json`).

&nbsp;

## 👤 Accounts
Open the `accounts.txt` file and put an account in each line in this format:  
`username:password:shared_secret`

`shared_secret` is optional. Only provide `username:password` if you don't want to use it.  

&nbsp;

**Login using QR-Code**:  
You want to login an account by scanning a QR-Code using your Steam Mobile App? Easy!  
Instead of providing a password for that account in `accounts.txt`, set the password to "qrcode".  
On startup, the bot will display a QR-Code in the log which you can scan using your Steam Mobile App.

Example:  
`myaccount1:qrcode`

The username you provide for that account does not need to be correct, it just needs to stay the same.  
It is only used to store a token in the database to re-use the existing session when starting the bot the next time (so you don't need to scan the QR-Code on every startup).

&nbsp;

## 📡 Proxies
If you are using many accounts it might make sense to add proxies so you don't have tons of sessions from the same IP.  
To do this, open the `proxies.txt` file and put as many HTTP proxies as you wish, line per line.  
The bot will spread all accounts equally on all available proxies, including your local IP.  
Your proxies must follow this format: `http://user:pass@1.2.3.4:8081`  
Please note that Steam might block some proxy providers.  

&nbsp;
  
## 📝 Config
Open the `config.json` in a text editor. This file allows you to configure various aspects of the idler.

**Key Configuration Options:**

- **`playingGames`**: Defines the games to idle.
  - You can set a custom non-Steam game name by passing a String as the first argument (e.g., `"My Custom Game"`).
  - Add Steam games by their AppID (e.g., `730` for CS:GO).
  - The bot will automatically attempt to request licenses for free-to-play games listed here if your accounts do not own them (limited to 50 games per hour per account).
  - **Per-account configuration**: To set specific games for specific accounts, make the first element of the `playingGames` array an object. Each key in this object should be an account name (from `accounts.txt`) and its value an array of games/AppIDs for that account. Any games/AppIDs listed after this object will be used as a general fallback for accounts not specified in the object.
    - Examples:
      - Display "In non-Steam game: Minecraft" and idle TF2 & CS:GO globally: `"playingGames": ["Minecraft", 440, 730]`
      - Display "Currently In-Game: Team Fortress 2" and idle TF2 & CS:GO globally: `"playingGames": [440, 730]`
      - Only appear as online and don't idle anything globally: `"playingGames": []`
      - For "myacc1": idle "Specific Game" & CSGO. For "myacc25": idle nothing. For all other accounts: idle "General Game" & TF2:
        `"playingGames": [{ "myacc1": ["Specific Game", 730], "myacc25": [] }, "General Game", 440]`
- **`onlinestatus`**: Sets the online status of the bot on Steam (e.g., Online, Away). Use a number from [this list](https://github.com/DoctorMcKay/node-steam-user/blob/master/enums/EPersonaState.js). If set to `null`, the bot will not change the online status.
- **`afkMessage`**: A message to automatically send in response to received chat messages. Leave empty (`""`) to disable.
- **`loginDelay`**: Time in milliseconds to wait between logging in multiple accounts.
- **`relogDelay`**: Time in milliseconds to wait before attempting to relog an account that lost connection.
- **`useLocalIP`**: Boolean. If `true`, your local IP will be used in the proxy rotation. If `false`, only proxies from `proxies.txt` will be used.
- **`logPlaytimeToFile`**: Boolean. If `true`, session playtime summaries will be logged to `playtime.txt`.
- **`dashboardPort`**: The port number for the web dashboard. Defaults to `3000` if not specified. (See Web Dashboard section below).

**Important Notes on `config.json`:**
- Ensure your JSON is valid. Missing commas or incorrect structures will cause the script to fail. Refer to the default `config.json` if unsure.
- The `steamApiKey` field is **no longer required or used**. Steam-related data for features like owned games and card drop info is now fetched using account web sessions. If you have an old `steamApiKey` entry in your `config.json`, it can be safely removed.

You don't have to keep `playingGames` on one line, this is done here for documentation purposes. I recommend spreading the array over multiple lines, especially when setting lots of different games for lots of different accounts.
  
&nbsp;

## 📊 Web Dashboard
This application includes a web dashboard for monitoring and managing your idling accounts.

**Accessing the Dashboard:**
- Once `node idler.js` is running, the dashboard is typically accessible at `http://localhost:PORT`.
- The `PORT` is determined by the `dashboardPort` value in your `config.json` file. If not specified, it defaults to `3000`.
  For example, if `dashboardPort` is `3000`, you would navigate to `http://localhost:3000` in your web browser.

**Features:**
- **Account Status Overview**: View the status of all configured accounts, including which games they are currently idling (AppIDs and custom names) and how long their current idling session has been active.
- **Detailed Game Information**: For each account, you can load and view:
    - A list of owned games, sorted by playtime, along with their icons and total playtime.
    - Information about games that are eligible for Steam trading card drops, including badge levels.
- **Log Viewer**: Access and view the application's output logs directly in your browser, with options for manual and auto-refresh.
- **Real-time Game Configuration**: Manage the `playingGames` configuration dynamically. You can view the current settings and update them (for all accounts or per-account) without restarting the main script. The changes are applied to active bots immediately.
- **Global Loading & Error Notifications**: The dashboard provides feedback on background operations and API call statuses.

The dashboard is a Vue.js application served by the main Node.js script. No separate build or run commands are needed by the end-user for the dashboard itself, as pre-built files are included and served automatically.

&nbsp;

## 🚀 Start
Then just type `node idler.js` to start the script.  
The script will try to log in and ask you for your Steam Guard code if it needs one. When it is logged in a logged in message will be displayed.  
The web dashboard will also become available on the configured port (default 3000).

Every time an account loses connection it will print a session summary to a text file "playtime.txt" (will be created automatically).  
This also applies to when you stop the bot manually. To turn this whole feature off, set `logPlaytimeToFile` in the config to `false`.

&nbsp;

Thats it. A simple cross-platform Steam game idling script powered by [DoctorMcKay's steam-user library](https://github.com/DoctorMcKay/node-steam-user).

&nbsp;

[![Stargazers over time](https://starchart.cc/3urobeat/steam-idler.svg?variant=adaptive)](https://starchart.cc/3urobeat/steam-idler)
