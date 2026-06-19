/**
 * Shared gacha (random loot) utilities.
 *
 * Both "00000" and "hiden projeck" use the same tiered random roll:
 *   SSR <= 5%, SR <= 20-25%, R otherwise.
 *
 * Usage:
 *   const tier = rollGacha();          // { tier: "SSR"|"SR"|"R", roll: 3.14 }
 *   const tier = rollGacha({ sr: 25 }) // custom SR threshold
 */

function rollGacha(thresholds) {
    var ssrMax = (thresholds && thresholds.ssr) || 5;
    var srMax  = (thresholds && thresholds.sr)  || 20;
    var roll   = Math.random() * 100;

    if (roll <= ssrMax) return { tier: "SSR", roll: roll };
    if (roll <= srMax)  return { tier: "SR",  roll: roll };
    return { tier: "R", roll: roll };
}

function displayGachaResult(elementId, tier, messages) {
    var defaults = {
        SSR: { text: "\u2b50 SSR: SUPER RARE!", color: "gold" },
        SR:  { text: "\u2728 SR: RARE",         color: "#00ffff" },
        R:   { text: "\ud83d\udc5f R: COMMON",  color: "#e0e0e0" },
    };
    var config = (messages && messages[tier]) || defaults[tier];
    var el = document.getElementById(elementId);
    el.innerText = config.text;
    if (el.style) el.style.color = config.color;
}
