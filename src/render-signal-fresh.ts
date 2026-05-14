/**
 * Forked version of wavedrom/lib/render-signal.js that creates a fresh lane
 * object per render call instead of using the shared mutable singleton.
 *
 * The original render-signal.js imports lane as a module-level singleton:
 *   var lane = require('./lane.js');
 * Every call to renderSignal mutates that singleton, leaking state into
 * subsequent renders when multiple wavedrom blocks appear in one note.
 *
 * This fork is structurally identical to the original — only the lane
 * instantiation is changed.
 */

// @ts-ignore — no type declarations for these wavedrom internals
import rec from 'wavedrom/lib/rec';
// @ts-ignore
import parseConfig from 'wavedrom/lib/parse-config';
// @ts-ignore
import parseWaveLanes from 'wavedrom/lib/parse-wave-lanes';
// @ts-ignore
import renderGroups from 'wavedrom/lib/render-groups';
// @ts-ignore
import renderLanes from 'wavedrom/lib/render-lanes';
// @ts-ignore
import renderWaveLane from 'wavedrom/lib/render-wave-lane';
// @ts-ignore
import insertSVGTemplate from 'wavedrom/lib/insert-svg-template';

import { createLane } from './lane-factory';

/**
 * Reads skin socket dimensions into the lane object.
 * The upstream WaveDrom guard `if (index !== 0) return` means this only fires
 * when index is exactly 0. Since we always pass a random 12-digit ID, it
 * effectively never runs — the lane factory defaults (xs=20, ys=20, xlabel=6,
 * ym=15) already match the skin socket defaults. Behaviour is identical to the
 * original plugin. Preserved as-is for parity with upstream render-signal.js.
 */
function laneParamsFromSkin(
    index: number,
    source: any,
    lane: any,
    waveSkin: any
): void {
    if (index !== 0) { return; }

    let first: string;
    for (first in waveSkin) { break; }

    let skin = waveSkin.default || waveSkin[first];

    if (source?.config?.skin && waveSkin[source.config.skin]) {
        skin = waveSkin[source.config.skin];
    }

    const socket = skin[3][1][2][1];
    lane.xs     = Number(socket.width);
    lane.ys     = Number(socket.height);
    lane.xlabel = Number(socket.x);
    lane.ym     = Number(socket.y);
}

/**
 * Renders a signal waveform and returns an ONML tree.
 * Identical to wavedrom renderSignal() except each call gets its own fresh
 * lane state — no cross-render mutation.
 */
export function renderSignalFresh(
    index: number,
    source: any,
    waveSkin: any,
    notFirstSignal?: boolean
): any {
    const lane = createLane();

    laneParamsFromSkin(index, source, lane, waveSkin);
    parseConfig(source, lane);

    const ret = rec(source.signal, { x: 0, y: 0, xmax: 0, width: [], lanes: [], groups: [] });
    const content = parseWaveLanes(ret.lanes, lane);

    const waveLanes  = renderWaveLane(content, index, lane);
    const waveGroups = renderGroups(ret.groups, index, lane);

    const xmax = waveLanes.glengths.reduce((res: number, len: number, i: number) => {
        return Math.max(res, len + ret.width[i]);
    }, 0);

    lane.xg = Math.ceil((xmax - lane.tgo) / lane.xs) * lane.xs;

    const onmlTree = insertSVGTemplate(
        index, source, lane, waveSkin, content,
        renderLanes(index, content, waveLanes, ret, source, lane),
        waveGroups,
        notFirstSignal
    );

    // insertSVGTemplate returns the shared skin array and mutates skin[1] in-place.
    // Shallow-clone both the array and its attribute node so each render is independent.
    const result = onmlTree.slice();
    result[1] = Object.assign({}, onmlTree[1]);

    return result;
}

