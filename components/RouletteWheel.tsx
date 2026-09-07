type RouletteWheelProps = {
  rotation?: number;
  spinning?: boolean;
};
const wheelNumbers: (number | "00")[] = [
  0, 28, 9, 26, 30, 11, 7, 20, 32, 17,
  5, 22, 34, 15, 3, 24, 36, 13, 1, "00",
  27, 10, 25, 29, 12, 8, 19, 31, 18, 6,
  21, 33, 16, 4, 23, 35, 14, 2
];

const redNumbers = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18,
  19, 21, 23, 25, 27, 30, 32, 34, 36
]);

const segmentColors = {
  red: "#7d2430",
  black: "#141815",
  green: "#07543f",
};

function getNumberColor(number: number | "00"): keyof typeof segmentColors {
  if (number === 0 || number === "00") {
    return "green";
  }

  if (
    typeof number === "number" &&
    redNumbers.has(number)
  ) {
    return "red";
  }

  return "black";
}

export default function RouletteWheel({
  rotation = 0,
  spinning = false,
}: RouletteWheelProps) {
  const segmentAngle = 360 / wheelNumbers.length;
  const wheelSegments = `conic-gradient(from ${-segmentAngle / 2}deg, ${wheelNumbers
    .map((number, index) => {
      const color = segmentColors[getNumberColor(number)];
      return `${color} ${index * segmentAngle}deg ${(index + 1) * segmentAngle}deg`;
    })
    .join(", ")})`;

  return (
    <div
      className="roulette-wrapper"
      aria-hidden="true"
    >

      <div className="roulette-pointer" />
      <div className={`roulette-ball ${spinning ? "in-motion" : ""}`} />

      <div
        className={`roulette-wheel ${spinning ? "spinning" : ""}`}
        style={{
          background: `radial-gradient(circle, #07100c 0 39%, transparent 39.5% 72%, rgba(255, 255, 255, 0.04) 72.5%), ${wheelSegments}`,
          transform: `rotate(${rotation}deg)`,
        }}
      >

        {wheelNumbers.map((number, index) => {
          const pocketRotation =
            segmentAngle * index;

          const color = getNumberColor(number);

          return (
            <div
              key={number}
              className={`roulette-number ${color}`}
              style={{
                transform: `rotate(${pocketRotation}deg) translateY(calc(var(--wheel-size) * -0.43))`
              }}
            >
              <span
                className="roulette-number-text"
                style={{
                  transform: `rotate(${-pocketRotation - rotation}deg)`
                }}
              >
                {number}
              </span>
            </div>
          );
        })}

        <div className="roulette-inner">
          <div
            className="roulette-center"
            style={{ transform: `rotate(${-rotation}deg)` }}
          >
            <span>ZK</span>
            <small>TESTNET</small>
          </div>
        </div>

      </div>

    </div>
  );
}
