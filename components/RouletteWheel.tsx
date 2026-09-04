const wheelNumbers = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34,
  6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18,
  29, 7, 28, 12, 35, 3, 26
];

export default function RouletteWheel() {
  return (
    <div className="roulette-wheel">
      {wheelNumbers.map((number, index) => {
        const rotation = (360 / wheelNumbers.length) * index;

        return (
          <div
            key={number}
            className="roulette-number"
            style={{
              transform: `rotate(${rotation}deg) translateY(-145px)`
            }}
          >
            <span
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
        <div className="roulette-center">ZK</div>
      </div>
    </div>
  );
}
