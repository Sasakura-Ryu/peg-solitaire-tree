/* global BigInt */
import { useState, useMemo } from "react";
import "./App.css";

function generateCenteredLayout(shape) {
  let num = 1;
  const maxWidth = Math.max(...shape);
  const layout = shape.map(count => {
    const leftPad = Math.floor((maxWidth - count) / 2);
    const rightPad = Math.ceil((maxWidth - count) / 2);
    return [
      ...Array(leftPad).fill(null),
      ...Array.from({ length: count }, () => num++),
      ...Array(rightPad).fill(null)
    ];
  });
  return layout;
}

const PATTERNS = {
  "Plus 33": generateCenteredLayout([3,3,7,7,7,3,3]),
  "Diamond 37": generateCenteredLayout([3,5,7,7,7,5,3]),
  "Square 49": Array.from({ length: 7 }, (_, r) =>
    Array.from({ length: 7 }, (_, c) => r * 7 + c + 1)
  ),
  "Square 25": Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => r * 5 + c + 1)
  )
};

const DIRS = [
  [0, 1], [0, -1], [1, 0], [-1, 0]
];

function flatten(pattern) {
  return pattern.flat().filter(x => x != null);
}

function getLegalMoves(pegs, layout) {
  const moves = [];
  const posToRC = {};
  layout.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell != null) posToRC[cell] = [r, c];
    });
  });
  for (const f of pegs) {
    const [r, c] = posToRC[f];
    for (const [dr, dc] of DIRS) {
      const r1 = r + dr, c1 = c + dc, r2 = r + 2 * dr, c2 = c + 2 * dc;
      if (
        layout[r1] && layout[r1][c1] != null &&
        layout[r2] && layout[r2][c2] != null
      ) {
        const o = layout[r1][c1], t = layout[r2][c2];
        if (pegs.has(o) && !pegs.has(t)) {
          moves.push([f, o, t]);
        }
      }
    }
  }
  return moves;
}

function apply(pegs, [f, o, t]) {
  const s = new Set(pegs);
  s.delete(f);
  s.delete(o);
  s.add(t);
  return s;
}

function solve(initial, layout, goalPos = null) {
  const memo = new Map();
  const key = (s) => Array.from(s).sort((a, b) => a - b).join(",");
  const dfs = (state) => {
    const k = key(state);
    if (memo.has(k)) return memo.get(k);
    if (state.size === 1) {
      const only = state.values().next().value;
      if (!goalPos || only === goalPos) return [];
      memo.set(k, null);
      return null;
    }
    for (const m of getLegalMoves(state, layout)) {
      const nxt = apply(state, m);
      const path = dfs(nxt);
      if (path) {
        memo.set(k, [m, ...path]);
        return [m, ...path];
      }
    }
    memo.set(k, null);
    return null;
  };
  return dfs(initial);
}

export default function PegSolitaire() {
  const [patternKey, setPatternKey] = useState("Plus 33");
  const layout = PATTERNS[patternKey];
  const cells = flatten(layout);
  const [initialPegs, setInitialPegs] = useState(new Set(flatten(layout)));
  const [history, setHistory] = useState([]);
  const [idx, setIdx] = useState(0);
  const [solving, setSolving] = useState(false);

  const current = history[idx] || { pegs: initialPegs, move: null };
  const legal = useMemo(() => getLegalMoves(current.pegs, layout), [current, layout]);
  const isCleared = current.pegs.size === 1;

  const startGame = () => {
    setHistory([{ pegs: new Set(initialPegs), move: null }]);
    setIdx(0);
  };

  const toggleFullBoard = () => {
    const all = new Set(cells);
    const newSet = (initialPegs.size === cells.length) ? new Set() : all;
    setInitialPegs(newSet);
    setHistory([]);
    setIdx(0);
  };

  const applyMove = (mv) => {
    const newPegs = apply(current.pegs, mv);
    const newHist = history.slice(0, idx + 1).concat([{ pegs: newPegs, move: mv }]);
    setHistory(newHist);
    setIdx(newHist.length - 1);
  };

  const autoClear = () => {
    if (solving || history.length === 0) return;
    setSolving(true);
    setTimeout(() => {
      const path = solve(current.pegs, layout);
      if (path) {
        let state = current.pegs;
        const newHist = [{ pegs: state, move: null }];
        for (const mv of path) {
          state = apply(state, mv);
          newHist.push({ pegs: state, move: mv });
        }
        setHistory(newHist);
        setIdx(newHist.length - 1);
      } else {
        alert("解が見つかりませんでした…");
      }
      setSolving(false);
    }, 100);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "1rem", alignItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <h2>盤面パターン選択</h2>
        <select value={patternKey} onChange={(e) => {
          setPatternKey(e.target.value);
          setInitialPegs(new Set(flatten(PATTERNS[e.target.value])));
          setHistory([]);
          setIdx(0);
        }}>
          {Object.keys(PATTERNS).map(k => <option key={k}>{k}</option>)}
        </select>

        <h2 style={{ marginTop: "1rem" }}>初期配置設定</h2>
        <div className="board">
          {layout.map((row, ri) => (
            <div className="row" key={ri}>
              {row.map((cell, ci) => (
                cell == null ? null : (
                  <div
                    key={ci}
                    className={`peg${initialPegs.has(cell) ? " active" : ""}`}
                    onClick={() => {
                      const s = new Set(initialPegs);
                      s.has(cell) ? s.delete(cell) : s.add(cell);
                      setInitialPegs(s);
                      setHistory([]);
                      setIdx(0);
                    }}
                  >{cell}</div>
                )
              ))}
            </div>
          ))}
        </div>

        <div style={{ marginTop: "1rem" }}>
          <button className="move-button" onClick={toggleFullBoard}>全配置</button>
          <button className="move-button" onClick={startGame} disabled={initialPegs.size === 0}>ゲーム開始</button>
          <button className="move-button" onClick={() => applyMove(legal[0])} disabled={legal.length === 0 || solving}>自動一手</button>
          <button className="move-button" onClick={autoClear} disabled={solving || history.length === 0}>自動クリア</button>
          <button className="move-button" onClick={() => { if (idx > 0) setIdx(idx - 1); }} disabled={idx === 0}>⬅️ 戻る</button>
          <button className="move-button" onClick={() => { if (idx < history.length - 1) setIdx(idx + 1); }} disabled={idx >= history.length - 1}>進む ➡️</button>
        </div>

        {history.length > 0 && (
          <div>
            <h2 style={{ marginTop: "1rem" }}>盤面</h2>
            <div className="board">
              {layout.map((row, ri) => (
                <div className="row" key={ri}>
                  {row.map((cell, ci) => (
                    cell == null ? null : (
                      <div key={ci} className={`peg${current.pegs.has(cell) ? " active" : ""}`}>{cell}</div>
                    )
                  ))}
                </div>
              ))}
            </div>

            <h2 style={{ marginTop: "1rem" }}>合法手一覧：</h2>
            {isCleared ? (
              <p style={{ color: 'green' }}>クリアしました！🎉</p>
            ) : legal.length === 0 ? (
              <p style={{ color: 'red' }}>これ以上進めません（詰み）</p>
            ) : (
              <div>
                {legal.map((m, i) => (
                  <button
                    key={i}
                    className="move-button"
                    onClick={() => applyMove(m)}
                  >
                    {m[0]} → {m[1]} → {m[2]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h3>履歴：</h3>
          <ol>
            {history.map((h, i) => (
              <li key={i} style={{ fontWeight: i === idx ? "bold" : "normal" }}>
                {h.move ? `${h.move[0]}→${h.move[1]}→${h.move[2]}` : "[開始]"}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
