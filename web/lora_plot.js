/**
 * ComfyUI-LoRAPlotNode — autogrow LoRA dropdowns.
 *
 * The backend declares lora_1 .. lora_50 as optional combo inputs. This
 * extension hides all of them except a growing window: it shows the first
 * empty slot after the last one that has a real selection.
 *
 * IMPORTANT (new Vue frontend): visibility is controlled by the widget's
 * `type` only. Setting `type = "hidden"` hides it; restoring the original
 * type shows it. Do NOT touch `widget.hidden` — the new frontend's `hidden`
 * setter writes `_rawOptions.hidden`, which then gets re-applied when `type`
 * is restored and pins the widget hidden. Growth is driven by polling
 * `widget.value` on a timer (widget callbacks are no-ops on the new frontend).
 */

import { app } from "../../scripts/app.js";

const NODE_ID = "LoRAPlotNode";
const MAX_LORAS = 50;

function loraIndex(name) {
    const m = /^lora_(\d+)$/.exec(name);
    return m ? parseInt(m[1], 10) : null;
}

function loraWidgets(node) {
    const ws = (node.widgets || []).filter((w) => loraIndex(w.name) !== null);
    ws.sort((a, b) => loraIndex(a.name) - loraIndex(b.name));
    return ws;
}

function setWidgetVisible(widget, visible) {
    if (!widget) return;
    if (visible) {
        widget.type = widget._dynOrigType ?? "combo";
    } else {
        if (widget.type !== "hidden") {
            widget._dynOrigType = widget.type;
        }
        widget.type = "hidden";
    }
}

// Shift non-None values up so there are no empty gaps in the middle of the
// list (e.g. clearing lora_2 moves lora_3's value into lora_2).
function compactLoras(node) {
    const ws = loraWidgets(node);
    const values = ws.map((w) => (w.value && w.value !== "None" ? w.value : null));

    let gap = -1;
    let hasLater = false;
    for (let i = 0; i < values.length; i++) {
        if (values[i] !== null) continue;
        for (let j = i + 1; j < values.length; j++) {
            if (values[j] !== null) {
                gap = i;
                hasLater = true;
                break;
            }
        }
        if (hasLater) break;
    }
    if (!hasLater) return;

    const nonNull = values.filter((v) => v !== null);
    for (let i = 0; i < ws.length; i++) {
        const target = i < nonNull.length ? nonNull[i] : "None";
        if (ws[i].value !== target) {
            ws[i].value = target;
        }
    }
}

// Number of slots to show: one empty slot below the last real selection.
function activeCount(node) {
    let last = 0;
    for (const w of loraWidgets(node)) {
        const v = w.value;
        if (v && v !== "None") {
            last = loraIndex(w.name);
        }
    }
    return Math.min(MAX_LORAS, Math.max(1, last + 1));
}

function syncSlots(node, count) {
    for (const w of loraWidgets(node)) {
        setWidgetVisible(w, loraIndex(w.name) <= count);
    }
    try {
        const size = node.computeSize();
        const w = Math.max(node.size?.[0] || 0, 320, size?.[0] || 0);
        node.setSize([w, size?.[1] || 0]);
        app.canvas?.setDirty(true, true);
    } catch (e) {
        console.error("[LoRAPlotNode] resize error", e);
    }
}

// Re-sync only when the active count actually changed (idempotent).
function maybeSync(node) {
    if (!node.widgets) return;
    compactLoras(node);
    const count = activeCount(node);
    if (count === node._dynLastCount) return;
    node._dynLastCount = count;
    syncSlots(node, count);
}

app.registerExtension({
    name: "LoRAPlotNode.dynamicLoras",

    nodeCreated(node) {
        if (node.comfyClass !== NODE_ID && node.type !== NODE_ID) return;

        node._dynLastCount = -1;
        maybeSync(node);

        node._dynTimer = setInterval(() => maybeSync(node), 200);

        const origRemoved = node.onRemoved;
        node.onRemoved = function () {
            if (node._dynTimer) {
                clearInterval(node._dynTimer);
                node._dynTimer = null;
            }
            return origRemoved?.apply(this, arguments);
        };
    },
});
