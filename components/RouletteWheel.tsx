import { useId } from "react";

const wheelNumbers = [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, "00", 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2] as const;
const redNumbers = new Set<number>([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function point(radius: number, degrees: number) {
  const radians = (degrees - 90) * Math.PI / 180;
  return `${(350 + radius * Math.cos(radians)).toFixed(4)},${(350 + radius * Math.sin(radians)).toFixed(4)}`;
}

// Center each wedge on the angle used by the existing result animation.
function pocketPath(index: number, outer: number, inner: number) {
  const angle = 360 / wheelNumbers.length;
  const start = index * angle - angle / 2;
  const end = start + angle;
  return `M${point(outer, start)} A${outer},${outer} 0 0 1 ${point(outer, end)} L${point(inner, end)} A${inner},${inner} 0 0 0 ${point(inner, start)} Z`;
}

export default function RouletteWheel({ rotation = 0, spinning = false }: { rotation?: number; spinning?: boolean }) {
  const id = useId().replace(/:/g, "");
  return <div className="roulette-wrapper" role="img" aria-label="American roulette wheel with 38 pockets">
    <svg className={`roulette-wheel ${spinning ? "spinning" : ""}`} viewBox="0 0 700 700" style={{ transform: `rotate(${rotation}deg)` }} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-silver`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#eee" /><stop offset=".16" stopColor="#555" /><stop offset=".34" stopColor="#c7c7c7" /><stop offset=".5" stopColor="#373737" /><stop offset=".72" stopColor="#dedede" /><stop offset="1" stopColor="#484848" /></linearGradient>
        <radialGradient id={`${id}-bowl`} cx="38%" cy="30%"><stop stopColor="#4a4a4a" /><stop offset=".5" stopColor="#242424" /><stop offset="1" stopColor="#0c0c0c" /></radialGradient>
      </defs>
      <circle cx="350" cy="350" r="346" fill="#090909" stroke="#717171" strokeWidth="2" />
      <circle cx="350" cy="350" r="333" fill="none" stroke={`url(#${id}-silver)`} strokeWidth="19" />
      <circle cx="350" cy="350" r="316" fill="#151515" stroke="#a0a0a0" strokeWidth="2" />
      {wheelNumbers.map((number, index) => {
        const color = number === 0 || number === "00" ? "green" : redNumbers.has(number) ? "red" : "black";
        return <g key={number} data-pocket={number} data-color={color}>
          <path d={pocketPath(index, 298, 239)} fill={color === "green" ? "#176b47" : color === "red" ? "#a5262c" : "#171717"} stroke="#aaa" strokeWidth="1" />
          <path d={pocketPath(index, 232, 205)} fill={color === "green" ? "#104b32" : color === "red" ? "#791c23" : "#111"} stroke="#999" strokeWidth="1" />
          <text className="roulette-number-text" x="350" y="78" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${index * 360 / 38} 350 350)`} fill="#f5f5f5" fontSize="21" fontWeight="500">{number}</text>
        </g>;
      })}
      <circle cx="350" cy="350" r="202" fill={`url(#${id}-bowl)`} stroke={`url(#${id}-silver)`} strokeWidth="6" />
      {wheelNumbers.map((number, index) => <path key={number} d={`M${point(197, index * 360 / 38)} L${point(54, index * 360 / 38)}`} stroke="#aaa" strokeOpacity=".12" />)}
      <circle cx="350" cy="350" r="70" fill={`url(#${id}-silver)`} stroke="#888" strokeWidth="2" />
      <circle cx="350" cy="350" r="53" fill={`url(#${id}-bowl)`} stroke="#ccc" strokeWidth="2" />
      <circle cx="350" cy="350" r="31" fill={`url(#${id}-silver)`} stroke="#bbb" strokeWidth="2" />
      <circle cx="350" cy="350" r="15" fill="#d9d9d9" />
    </svg>
    <div className="roulette-pointer" aria-hidden="true" />
  </div>;
}
