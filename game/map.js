// map.js — the vale: grid, the rune road's pixel waypoints, terrain render,
// and which tiles may hold a tower.
"use strict";

AK.Map = {
  // pixel waypoints along tile centres, spawn (off-grid) to the crystal gate
  points: [],
  totalLen: 0,
  init() {
    const T = AK.CFG.TILE;
    this.points = AK.PATH_TILES.map(([c, r]) => ({
      x: AK.CFG.MAP_X + (c + 0.5) * T,
      y: AK.CFG.MAP_Y + (r + 0.5) * T,
    }));
    this.totalLen = 0;
    for (let i = 1; i < this.points.length; i++) {
      this.totalLen += AK.dist(this.points[i - 1].x, this.points[i - 1].y, this.points[i].x, this.points[i].y);
    }
    // set of "c,r" that are road
    this.road = new Set();
    const seg = (c0, r0, c1, r1) => {
      const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0);
      let c = c0, r = r0;
      this.road.add(c + "," + r);
      while (c !== c1 || r !== r1) { c += dc; r += dr; this.road.add(c + "," + r); }
    };
    for (let i = 1; i < AK.PATH_TILES.length; i++) {
      const [c0, r0] = AK.PATH_TILES[i - 1], [c1, r1] = AK.PATH_TILES[i];
      seg(Math.max(0, c0), r0, Math.min(AK.CFG.COLS - 1, c1), r1);
    }
  },
  tileAt(px, py) {
    const c = Math.floor((px - AK.CFG.MAP_X) / AK.CFG.TILE);
    const r = Math.floor((py - AK.CFG.MAP_Y) / AK.CFG.TILE);
    if (c < 0 || r < 0 || c >= AK.CFG.COLS || r >= AK.CFG.ROWS) return null;
    return { c, r };
  },
  tileCenter(c, r) {
    return { x: AK.CFG.MAP_X + (c + 0.5) * AK.CFG.TILE, y: AK.CFG.MAP_Y + (r + 0.5) * AK.CFG.TILE };
  },
  buildable(c, r) {
    const k = c + "," + r;
    if (this.road.has(k) || AK.BLOCKED[k]) return false;
    if (c === AK.CRYSTAL_TILE[0] && r === AK.CRYSTAL_TILE[1]) return false;
    return true;
  },
  draw(ctx, t) {
    const { MAP_X, MAP_Y, TILE, COLS, ROWS } = AK.CFG;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const k = c + "," + r, x = MAP_X + c * TILE, y = MAP_Y + r * TILE;
      let img = AK.SPR.tile.grass[(c * 7 + r * 13) % 4];
      if (this.road.has(k)) img = AK.SPR.tile.path;
      else if (AK.BLOCKED[k] === "pond") img = AK.SPR.tile.pond;
      else if (AK.BLOCKED[k]) img = AK.SPR.tile.rubble;
      ctx.drawImage(img, x, y);
    }
    // road runes pulse gently toward the crystal
    ctx.fillStyle = "rgba(140,190,255,0.5)";
    const n = 26;
    for (let i = 0; i < n; i++) {
      const d = ((t * 46 + i * (this.totalLen / n)) % this.totalLen);
      const p = this.posAt(d);
      ctx.globalAlpha = 0.25 + 0.35 * Math.sin(t * 3 + i);
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // the crystal and its gate
    const cc = this.tileCenter(AK.CRYSTAL_TILE[0], AK.CRYSTAL_TILE[1]);
    const pulse = 1 + Math.sin(t * 2.2) * 0.045;
    ctx.save(); ctx.translate(cc.x, cc.y + 4); ctx.scale(pulse, pulse);
    ctx.drawImage(AK.SPR.crystal, -52, -58); ctx.restore();
  },
  // position + heading at distance d along the road
  posAt(d) {
    const pts = this.points;
    for (let i = 1; i < pts.length; i++) {
      const segLen = AK.dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      if (d <= segLen) {
        const t = segLen === 0 ? 0 : d / segLen;
        return {
          x: AK.lerp(pts[i - 1].x, pts[i].x, t), y: AK.lerp(pts[i - 1].y, pts[i].y, t),
          ang: Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x),
        };
      }
      d -= segLen;
    }
    const last = pts[pts.length - 1], prev = pts[pts.length - 2];
    return { x: last.x, y: last.y, ang: Math.atan2(last.y - prev.y, last.x - prev.x) };
  },
};
