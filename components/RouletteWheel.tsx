type RouletteWheelProps = {
  rotation?: number;
  spinning?: boolean;
};
const wheelNumbers = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34,
  6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18,
  29, 7, 28, 12, 35, 3, 26
];

const redNumbers = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18,
  19, 21, 23, 25, 27, 30, 32, 34, 36
]);

function getNumberColor(number: number) {
  if (number === 0) return "green";
  if (redNumbers.has(number)) return "red";
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
          const rotation =
            (360 / wheelNumbers.length) * index;

          const color = getNumberColor(number);

          return (
            <div
              key={number}
              className={`roulette-number ${color}`}
              style={{
                transform: `rotate(${rotation}deg) translateY(-145px)`
              }}
            >
             <span
  className="roulette-number-text"
  style={{
    transform: `rotate(-${rotation}deg)`
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
