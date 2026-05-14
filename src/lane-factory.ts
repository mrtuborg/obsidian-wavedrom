/**
 * Returns a fresh lane state object for each render call.
 *
 * WaveDrom's original lane.js exports a shared singleton that gets mutated on
 * every render, causing state leakage between diagrams in the same note.
 * Using this factory ensures every render starts from a clean baseline.
 */
export function createLane(): Record<string, any> {
    return {
        xs    : 20,   // tmpgraphlane0.width
        ys    : 20,   // tmpgraphlane0.height
        xg    : 120,  // tmpgraphlane0.x
        yh0   : 0,    // head gap title
        yh1   : 0,    // head gap
        yf0   : 0,    // foot gap
        yf1   : 0,    // foot gap
        y0    : 5,    // tmpgraphlane0.y
        yo    : 30,   // tmpgraphlane1.y - y0
        tgo   : -10,  // tmptextlane0.x - xg
        ym    : 15,   // tmptextlane0.y - y0
        xlabel: 6,    // tmptextlabel.x - xg
        xmax  : 1,
        scale : 1,
        head  : {},
        foot  : {}
    };
}
