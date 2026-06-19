/**
 * Shared keyboard input handler for arrow-key / WASD movement.
 *
 * Usage:
 *   registerArrowKeys(function(dx, dy) {
 *       x += dx * 10;
 *       y += dy * 10;
 *   });
 */

function registerArrowKeys(onMove) {
    document.addEventListener("keydown", function (e) {
        var key = e.key.toLowerCase();
        switch (key) {
            case "arrowup":    case "w": onMove( 0, -1); break;
            case "arrowdown":  case "s": onMove( 0,  1); break;
            case "arrowleft":  case "a": onMove(-1,  0); break;
            case "arrowright": case "d": onMove( 1,  0); break;
        }
    });
}
