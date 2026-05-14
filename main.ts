import { Plugin, MarkdownPostProcessorContext } from 'obsidian';
// @ts-ignore — no type declarations for wavedrom internals
import waveskin from 'wavedrom/skins/default';
import { parse } from 'json5';
import { customAlphabet } from 'nanoid';
// @ts-ignore
import onmlStringify from 'onml/stringify.js';
// @ts-ignore
import renderAssign from 'logidrom/lib/render-assign.js';
// @ts-ignore
import renderReg from 'wavedrom/lib/render-reg';
import { renderSignalFresh } from './src/render-signal-fresh';

const nanoid = customAlphabet('1234567890', 12);
const nanoidNum = () => parseInt(nanoid());

export default class ObsidianWaveDrom extends Plugin {

  async onload() {
    this.registerMarkdownCodeBlockProcessor(
      'wavedrom',
      (src, el, ctx) => this.postProcessor(src, el, ctx)
    );
    console.log('Obsidian wavedrom loaded');
  }

  postProcessor(
    src: string,
    el: HTMLElement,
    _?: MarkdownPostProcessorContext,
  ) {
    try {
      const source = parse(src);
      const index  = nanoidNum();

      // Dispatch to the appropriate renderer and get an ONML tree.
      // Signal diagrams use our fresh-lane fork to avoid shared-state bugs.
      // Assign/reg diagrams don't touch the lane singleton so the originals are fine.
      let onmlTree: any;
      if (source.signal) {
        onmlTree = renderSignalFresh(index, source, waveskin);
      } else if (source.assign) {
        onmlTree = renderAssign(index, source);
      } else if (source.reg) {
        onmlTree = renderReg(index, source);
      } else {
        onmlTree = ['div', {}];
      }

      // Apply WaveDrom class and SVG namespace attributes before serialising.
      // create-element.js normally does this step; we replicate it here so we
      // can serialise to a string and avoid DOMParser cross-document issues.
      onmlTree[1].class           = 'WaveDrom';
      onmlTree[1].xmlns           = 'http://www.w3.org/2000/svg';
      onmlTree[1]['xmlns:xlink']  = 'http://www.w3.org/1999/xlink';

      const svgString = onmlStringify(onmlTree);

      // Wrap in a scrollable container for mobile viewport compatibility
      const container = document.createElement('div');
      container.classList.add('wavedrom-container');
      container.innerHTML = svgString;
      el.appendChild(container);

    } catch (error) {
      const errorEl = document.createElement('pre');
      errorEl.classList.add('wavedrom-error');
      errorEl.textContent = `WaveDrom Error: ${(error as Error).message}`;
      el.appendChild(errorEl);
    }
  }

  onunload() {
    // Processors registered via registerMarkdownCodeBlockProcessor are cleaned
    // up automatically by the Plugin base class — no manual unregister needed.
    console.log('Obsidian wavedrom unloaded');
  }
}




