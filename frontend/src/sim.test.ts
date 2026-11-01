import assert from "node:assert/strict";
import test from "node:test";
import { bearing, buildMessage, distanceM, fixAt, routeLengthM, type Device, type Field } from "./sim.ts";

const square: Device = {
  id: "d", name: "whisky", color: "#000", speedKmh: 36,
  route: [[0, 0], [0, 0.01], [0.01, 0.01], [0.01, 0]],
};

test("distance and bearing", () => {
  assert.ok(Math.abs(distanceM([0, 0], [0, 1]) - 111_195) < 1);
  assert.equal(Math.round(bearing([0, 0], [0, 1])), 90);
  assert.equal(Math.round(bearing([0, 0], [1, 0])), 0);
});

test("devices loop around their route", () => {
  const leg = distanceM([0, 0], [0, 0.01]);
  const atHalfLeg = fixAt(square, leg / 2 / 10)!;
  assert.ok(Math.abs(atHalfLeg.position[1] - 0.005) < 1e-9);
  assert.equal(Math.round(atHalfLeg.heading), 90);

  const lap = routeLengthM(square.route) / 10;
  const again = fixAt(square, lap + leg / 2 / 10)!;
  assert.ok(Math.abs(again.position[1] - 0.005) < 1e-9);
});

test("parked and unplaced devices", () => {
  assert.equal(fixAt({ ...square, route: [] }, 5), null);
  assert.deepEqual(fixAt({ ...square, route: [[1, 2]] }, 5), { position: [1, 2], heading: 0, speedKmh: 0 });
  assert.equal(fixAt({ ...square, speedKmh: 0 }, 5)!.speedKmh, 0);
});

test("message fields", () => {
  const fields: Field[] = [
    { id: "1", name: "deviceId", kind: "deviceId" },
    { id: "2", name: "ts", kind: "epochMs" },
    { id: "3", name: "lat", kind: "latitude" },
    { id: "4", name: "n", kind: "number", value: "4.5" },
    { id: "5", name: "on", kind: "boolean", value: "true" },
    { id: "6", name: "dice", kind: "random", min: 6, max: 1 },
    { id: "7", name: "pick", kind: "choice", value: "a, b ,," },
    { id: "8", name: "  ", kind: "text", value: "dropped" },
  ];
  const fix = { position: [48.1234567, 2] as [number, number], heading: 0, speedKmh: 0 };
  for (let i = 0; i < 50; i++) {
    const m = buildMessage(fields, square, fix, new Date(1000));
    assert.equal(m.deviceId, "whisky");
    assert.equal(m.ts, 1000);
    assert.equal(m.lat, 48.123457);
    assert.equal(m.n, 4.5);
    assert.equal(m.on, true);
    assert.ok(Number.isInteger(m.dice) && (m.dice as number) >= 1 && (m.dice as number) <= 6);
    assert.ok(m.pick === "a" || m.pick === "b");
    assert.equal(Object.keys(m).length, 7);
  }
});
