/**
 * Shared canvas initialization utilities.
 *
 * Usage:
 *   const { canvas, ctx } = initCanvas("gameCanvas");
 */

function initCanvas(elementId) {
    const canvas = document.getElementById(elementId);
    const ctx = canvas.getContext("2d");
    return { canvas, ctx };
}

function clearCanvas(ctx, canvas, fillStyle) {
    ctx.fillStyle = fillStyle || "#0f0f1f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}
