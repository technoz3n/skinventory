// ==UserScript==
// @name         Shell Shockers: Skin Unlocker (StateFarm Reinforced)
// @description  Hardened skin unlocker for content creators.
// @version 0.1
// @author       StateFarm (Sanitized)
// @run-at       document-start
// @match        *://*.shellshock.io/*
// @match        *://*.shellshockers.site/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @require      https://cdn.jsdelivr.net/npm/tweakpane@3.1.10/dist/tweakpane.min.js
// ==/UserScript==

(function () {
    const storageKey = "SFC_Cosmetics_";
    let configMain = { unlockSkins: GM_getValue(storageKey + "unlockSkins") || false };
    let attemptedInjection = false;

    // --- The Global Hook ---
    // This is the bridge between the modified game code and our script
    unsafeWindow.checkSkinUnlock = function () {
        return configMain.unlockSkins;
    };

    const applyStateFarm = function (js) {
        console.log('StateFarm Cosmetics: Analyzing game engine...');

        // The Regex: We look for the exact ownership verification pattern.
        // Even if variables change names (e.g. 'a.id === b.id'), the structure 'return !0;return !1' is consistent.
        const inventoryRegex = /inventory\[[a-zA-Z$_0-9]+\].id===[a-zA-Z$_0-9]+.id\)return!0;return!1/;
        const match = js.match(inventoryRegex);

        if (match) {
            // We inject our global hook directly into the game's logic return
            const reinforcedHook = match[0].replace("return!0", "return(window.checkSkinUnlock()||true)").replace("return!1", "return(window.checkSkinUnlock()?true:false)");

            // Note: We force the return to be true if the hook is active.
            const newJs = js.replace(match[0], reinforcedHook);

            attemptedInjection = true;
            console.log("StateFarm Cosmetics: Hook successfully attached to inventory logic.");
            return newJs;
        } else {
            console.error("StateFarm Cosmetics: Failed to find inventory logic. The game may have updated.");
            return js;
        }
    };

    // --- The Interceptor ---
    // This catches the game script as it's being added to the HTML
    const originalAppend = HTMLElement.prototype.appendChild;
    HTMLElement.prototype.appendChild = function(node) {
        if (node.tagName === 'SCRIPT' && node.innerHTML && node.innerHTML.includes('inventory')) {
            if (node.innerHTML.startsWith('(()=>{')) {
                node.innerHTML = applyStateFarm(node.innerHTML);
            }
        }
        return originalAppend.call(this, node);
    };

    // Backup interceptor for textContent assignment
    const descriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'textContent');
    Object.defineProperty(HTMLScriptElement.prototype, 'textContent', {
        set: function(val) {
            if (val.startsWith('(()=>{') && val.includes('inventory')) {
                val = applyStateFarm(val);
            }
            return descriptor.set.call(this, val);
        }
    });

    // --- UI & Controls ---
    const initMenu = function () {
        const pane = new Tweakpane.Pane({ title: "Cosmetics Only" });
        pane.containerElem_.style.zIndex = "10000";

        pane.addInput(configMain, 'unlockSkins', { label: 'Unlock All Skins' }).on('change', (ev) => {
            GM_setValue(storageKey + "unlockSkins", ev.value);
            // Alert user to refresh inventory
            console.log("Cosmetics: Skin toggle changed. Re-open Inventory to see changes.");
        });

        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyH' && document.activeElement.tagName !== 'INPUT') {
                pane.hidden = !pane.hidden;
            }
        });
    };

    // --- Safety Check ---
    // If after 5 seconds the game is running but we didn't inject, reload once.
    setTimeout(() => {
        if (!attemptedInjection && location.pathname === "/") {
            console.warn("StateFarm Cosmetics: Injection missed. Reloading for second attempt...");
            location.reload();
        }
    }, 5000);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMenu);
    } else {
        initMenu();
    }
})();
