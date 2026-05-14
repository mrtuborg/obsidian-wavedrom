# WaveDrom Visual Test Suite

Use this note to visually validate the plugin after installation.
Enable the **WaveDrom** plugin in Settings → Community plugins → WaveDrom, then switch to **Reading View**.

---

## 1. Basic clock signal

```wavedrom
{ signal: [
  { name: "clk", wave: "p......." }
]}
```

---

## 2. Classic bus transaction

```wavedrom
{ signal: [
  { name: "clk",  wave: "p......." },
  { name: "bus",  wave: "x.==.=x.", data: ["head", "body", "tail"] },
  { name: "wire", wave: "0.1..0.." }
]}
```

---

## 3. Signal groups + head/foot caption

```wavedrom
{ signal: [
  ["Master",
    { name: "clk",  wave: "p......" },
    { name: "addr", wave: "x.=====", data: ["0x00","0x01","0x02","0x03","0x04"] }
  ],
  {},
  ["Slave",
    { name: "ack",  wave: "0....10" },
    { name: "data", wave: "x....=x", data: ["0xFF"] }
  ]
],
  head: { text: "SPI read transaction", tick: 0 },
  foot: { text: "7 clock cycles", tock: 0 }
}
```

---

## 4. Horizontal scale (hscale: 2)

```wavedrom
{ signal: [
  { name: "clk",  wave: "p......." },
  { name: "data", wave: "x.==.=x.", data: ["A", "B", "C"] }
],
  config: { hscale: 2 }
}
```

---

## 5. All wave types (z, x, 0, 1, p, n, =, 2..9)

```wavedrom
{ signal: [
  { name: "high-z",      wave: "z......." },
  { name: "undefined",   wave: "x......." },
  { name: "low",         wave: "0......." },
  { name: "high",        wave: "1......." },
  { name: "pos clock",   wave: "p......." },
  { name: "neg clock",   wave: "n......." },
  { name: "data bus",    wave: "x.==.=x.", data: ["D0","D1","D2"] },
  { name: "data bus 2",  wave: "x.23.4x.", data: ["A","B","C"] }
]}
```

---

## 6. Multiple diagrams on same page (state isolation regression)

Both diagrams below must render with identical, correct dimensions.
If the lane-singleton bug were present the second would be wrong.

```wavedrom
{ signal: [
  { name: "clk",  wave: "p......." },
  { name: "data", wave: "x.==.=x.", data: ["head","body","tail"] },
  { name: "en",   wave: "0.1....0" }
]}
```

```wavedrom
{ signal: [
  { name: "clk",  wave: "p......." },
  { name: "data", wave: "x.==.=x.", data: ["head","body","tail"] },
  { name: "en",   wave: "0.1....0" }
]}
```

---

## 7. Register map — simple byte

```wavedrom
{ reg: [
  { name: "RW",    bits: 1 },
  { name: "ADDR",  bits: 7 },
  { name: "DATA",  bits: 8 }
]}
```

---

## 8. Register map — complex control register

```wavedrom
{ reg: [
  { name: "EN",    bits: 1,  attr: "rw" },
  { name: "MODE",  bits: 2,  attr: "rw" },
  { name: "RES",   bits: 1,  attr: "ro" },
  { name: "IRQ",   bits: 1,  attr: "rw" },
  { name: "0",     bits: 3             },
  { name: "DATA",  bits: 8,  attr: "rw" },
  { name: "ADDR",  bits: 16, attr: "rw" }
]}
```

---

## 9. Logic assignment (combinational logic)

```wavedrom
{ assign: [
  ["out",
    ["|",
      ["&", ["~", "a"], "b"],
      ["&", "a", ["~", "b"]]
    ]
  ]
]}
```

---

## 10. Logic: NAND gate

```wavedrom
{ assign: [["Y", ["~&", "A", "B"]]] }
```

---

## 11. Edge annotations

```wavedrom
{ signal: [
  { name: "A", wave: "01.0.",  node: ".a..e" },
  { name: "B", wave: "0.1.0",  node: "..b.." },
  { name: "C", wave: "0..10",  node: "...c." }
],
  edge: [ "a->b t1", "b->c t2", "a->c t3" ]
}
```

---

## 12. Error handling — invalid JSON5

The block below is intentionally broken.  
You should see a red `WaveDrom Error:` message, not a crash.

```wavedrom
{ signal: [{ name: "clk", wave:
```

---

## 13. Empty block (no diagram type)

The block below has no `signal`, `assign`, or `reg` key — renders as an empty element, no error.

```wavedrom
{}
```

---

## 14. Wide diagram — horizontal scroll on mobile

On a narrow viewport (or mobile), this diagram should be horizontally scrollable.

```wavedrom
{ signal: [
  { name: "clk",  wave: "p.........................................." },
  { name: "data", wave: "x.============================.=======.x.", data: ["D0","D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16","D17","D18","D19","D20","D21","D22","D23","D24","D25","D26","D27","D28","D29","D30"] }
]}
```

---

## 15. Regression — complex reg map (reported broken in v0.1.1 after Obsidian v1.0.0 upgrade)

4-lane register map with `hflip`, `compact`, `label`, and field `type` colours.
Must render 4 rows labelled LW / LV / SW / SV1 with correct bit-field colouring.

```wavedrom
{"reg": [
  {"bits": 2, "name": "op=00",      "type": 8},
  {"bits": 3, "name": "rd",         "type": 2},
  {"bits": 2, "name": "imm",        "type": 3},
  {"bits": 3, "name": "rs1",        "type": 4},
  {"bits": 3, "name": "imm",        "type": 3},
  {"bits": 3, "name": "funct3=010", "type": 8},

  {"bits": 2, "name": "op=11",      "type": 8},
  {"bits": 5, "name": "rd",         "type": 2},
  {"bits": 1, "name": "imm",        "type": 3},
  {"bits": 3, "name": "rs1",        "type": 4},
  {"bits": 3, "name": "imm",        "type": 3},
  {"bits": 2, "name": "01",         "type": 8},

  {"bits": 2, "name": "op=00",      "type": 8},
  {"bits": 3, "name": "rs2",        "type": 4},
  {"bits": 2, "name": "imm",        "type": 3},
  {"bits": 3, "name": "rs1",        "type": 4},
  {"bits": 3, "name": "imm",        "type": 3},
  {"bits": 3, "name": "funct3=110", "type": 8},

  {"bits": 2, "name": "op=11",      "type": 8},
  {"bits": 5, "name": "rs2=0",      "type": 4},
  {"bits": 2, "name": "imm",        "type": 3},
  {"bits": 3, "name": "rs1",        "type": 4},
  {"bits": 3, "name": "imm",        "type": 3},
  {"bits": 1, "name": "1",          "type": 8}
],
"config": {
  "hflip": true,
  "bits": 64,
  "lanes": 4,
  "compact": true,
  "label": {"right": ["LW", "LV", "SW", "SV1"]}
}}
```
