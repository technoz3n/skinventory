// ==UserScript==
// @name         Selective Skin Unlocker
// @namespace    https://github.com/Hydroflame522/StateFarmClient/
// @version      1.1.0
// @description  easily unlock specific skins and adjust your fov.
// @author       StateFarmClient devs & techy
// @match         *://*.shellshock.io/*
// @match         *://*.algebra.best/*
// @match         *://*.biologyclass.club/*
// @match         *://*.geometry.monster/*
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// ==/UserScript==

/* ============================================================
    instructions for skids, do not ask me for help
   ============================================================

    1. how to change fov:
       if it isnt obvious enough, you see the 'fov' variable below. change that number to whatever 100-110 is usually best. or you can type in the console 'clientConfig.fov=fov number'

    2. the skin thingy:
       put the id numbers of the skins you want into the 'wantedSkins' list.
       for example: [1148, 3121, 16008] i recommend commenting what the name of the skin is in the code so you dont confuse yourself

    3. how to find a item's id:
       - open shell shockers.
       - open the console.
       - type in: getItemID("skin name")  <-- if it also isnt obvious replace skin name with what youre actually looking for.
       - then it will list the id numbers and skin name for you. copy the id number into the list below.

    4. troubleshooting:
       - if it doesn't work, refresh the page. and if it still doesnt work, the state farm devs havent uploaded the newest client keys yet, so just wait, its out of my control
       - make sure you are logged in.
       - ensure you haven't deleted anything important.
   ============================================================
*/

(function () {
    const __DEBUG__ = true;

    // config
    unsafeWindow.clientConfig = {
        fov: 101,             // fov
        unlockSkins: true,    // change this to false to turn off, or if you want it off by default
        wantedSkins: [        // item ids
            // 1148, 3121, 16008, 3021, 4021, 3116, 3137, 4016, 4036, 2042, 1382, 1043, 1054, 1486, 1138, 2093
            // uncomment the line above and replace it with the skin ids you want
        ]
    };

    const clientKeysURL = `https://raw.githubusercontent.com/StateFarmNetwork/client-keys/refs/heads/main/statefarm_`; //all credit to sfc devs
    let H_Keys = {};
    let functionNames = {};

    unsafeWindow.getItemID = function(query) {
        const global = unsafeWindow.gameGlobal;
        if (!global || !global.catalog) return "error: sorry but the global data wasnt found";
        const cat = global.catalog;
        const searchTerm = query.toLowerCase();
        const allItems = Object.values(cat)
            .filter(val => Array.isArray(val))
            .flat();
        if (allItems.length === 0) return "error: catalog is empty";
        const matches = allItems.filter(i => {
            if (!i) return false;
            const nameMatch = i.name && i.name.toLowerCase().includes(searchTerm);
            const tagMatch = i.tag && i.tag.toLowerCase().includes(searchTerm);
            const brandMatch = i.brand && i.brand.toLowerCase().includes(searchTerm);
            const collMatch = i.collection && i.collection.toLowerCase().includes(searchTerm);
            return nameMatch || tagMatch || brandMatch || collMatch;
        });
        return matches.length > 0 ? matches.map(i => ({
            name: i.name,
            id: i.id,
            tag: i.tag || i.brand || "No Tag",
            type: i.type_id || "N/A"
        })) : "no matches found. you sure you typed it correctly?";
    };

    function initVisuals() {
        const style = document.createElement('style');
        style.innerHTML = `
            #crosshair {
                position: fixed; top: 50%; left: 50%; width: 15px; height: 2px;
                background: white; transform: translate(-50%, -50%);
                z-index: 1000000; pointer-events: none;
            }
            #crosshair::after {
                content: ''; position: absolute; top: 50%; left: 50%; width: 2px; height: 15px;
                background: white; transform: translate(-50%, -50%);
            }
        `;
        document.head.appendChild(style);
        const crosshair = document.createElement('div');
        crosshair.id = 'crosshair';
        document.body.appendChild(crosshair);
    }

    document.addEventListener("DOMContentLoaded", initVisuals);

    const log = function(...args) { if (__DEBUG__) console.log("[Client] ", ...args); };

    String.prototype.originalReplaceAll = String.prototype.replaceAll;

    const fetchTextContent = function (url) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.send();
        return xhr.status === 200 ? xhr.responseText : null;
    };

    const getScrambled = () => Array.from({ length: 10 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');

    function createAnonFunction(name, func) {
        const funcName = getScrambled();
        unsafeWindow[funcName] = func;
        functionNames[name] = funcName;
    }

    createAnonFunction('fixCamera', () => (unsafeWindow.clientConfig.fov * (Math.PI / 180)));
    createAnonFunction('getSkinHack', (id) => unsafeWindow.clientConfig.unlockSkins && unsafeWindow.clientConfig.wantedSkins.includes(id));

    let _apc = HTMLElement.prototype.appendChild;
    HTMLElement.prototype.appendChild = function(node) {
        if (node.tagName === 'SCRIPT' && node.innerHTML && node.innerHTML.startsWith('(()=>{')) {
            node.innerHTML = processGameScript(node.innerHTML);
        }
        return _apc.call(this, node);
    };

    function processGameScript(js) {
        let onlineClientKeys = fetchTextContent(clientKeysURL + "latest.json?v=" + Date.now());
        if (!onlineClientKeys) return js;

        let clientKeys = JSON.parse(onlineClientKeys);
        H_Keys = clientKeys.vars;

        let catalogMatch = js.match(/([a-zA-Z$_]+)\.catalog/);
        if (catalogMatch) {
            let globalVar = catalogMatch[1];
            js = js.originalReplaceAll(`${globalVar}.catalog`, `(window.gameGlobal=${globalVar}, ${globalVar}).catalog`);
            log(`global object trapped via '${globalVar}'`);
        }

        if (H_Keys.fov) {
            js = js.originalReplaceAll(`${H_Keys.fov}=1.25`, `${H_Keys.fov}=window.${functionNames.fixCamera}()`);
        }

        let pattern = /inventory\[([a-zA-Z$_]+)\]\.id===([a-zA-Z$_]+)\.id/;
        let match = js.match(pattern);

        if (match) {
            let itemVar = match[2];
            js = js.originalReplaceAll(match[0], match[0] + `||window.${functionNames.getSkinHack}(${itemVar}.id)`);
            log("selective skin hook injected via " + itemVar);
        }

        return js;
    }
})();
