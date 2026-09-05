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

function getNumberColor(number: number | "00") {
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
  return (
    <div className="roulette-wrapper">

      <div className="roulette-pointer" />

      <div
  className={`roulette-wheel ${spinning ? "spinning" : ""}`}
  style={{
    transform: `rotate(${rotation}deg)`,
  }}
>

        {wheelNumbers.map((number, index) => {
          const pocketRotation =
  (360 / wheelNumbers.length) * index;

          const color = getNumberColor(number);

          return (
            <div
              key={number}
              className={`roulette-number ${color}`}
              style={{
                transform: `rotate(${pocketRotation}deg) translateY(-145px)`
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
          <div className="roulette-center">
            ZK
          </div>
        </div>

      </div>

    </div>
  );
}
