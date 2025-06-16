import { useEffect, useRef, useState } from 'react';

const FLOOR_MIN = 1;
const FLOOR_MAX = 10;
const MAX_PASSENGERS = 40;
const ELEVATOR_CAPACITY = 5;
const MOVE_TIME = 1;
const STOP_TIME = 1;

const ELEVATOR_STATUS = {
  MOVING: 'moving',
  LOADING: 'loading',
  IDLE: 'idle',
};

const PASSENGER_STATUS = {
  WAITING: 'waiting',
  IN_ELEVATOR: 'inElevator',
  DONE: 'done',
};

const createElevator = (id, waitingMap) => ({
  id,
  floor: 1,
  direction: 'idle',
  status: ELEVATOR_STATUS.IDLE,
  statusTimer: 0,
  passengers: [],
  targetFloors: new Set(),
  waitingMap,

  canStop() {
    if (this.status === ELEVATOR_STATUS.IDLE) return true;
    if (this.status === ELEVATOR_STATUS.LOADING && this.statusTimer >= STOP_TIME) return true;
    if (this.status === ELEVATOR_STATUS.MOVING && this.statusTimer >= MOVE_TIME && this.shouldStopAtFloor()) return true;
    return false;
  },

  move() {
    if (this.status === ELEVATOR_STATUS.MOVING) {
      if (this.statusTimer >= MOVE_TIME) {
        this.floor += this.direction === 'up' ? 1 : this.direction === 'down' ? -1 : 0;
        this.statusTimer = 0;
        if (this.shouldStopAtFloor()) this.status = ELEVATOR_STATUS.LOADING;
        return true;
      }
      this.statusTimer++;
    }
    return false;
  },

  shouldStopAtFloor() {
    if (this.targetFloors.has(this.floor)) return true;
    const waitingPassengers = this.waitingMap.get(this.floor) || [];
    const hasMatch = waitingPassengers.some((p) => {
      const dir = p.to > this.floor ? 'up' : 'down';
      return p.status === PASSENGER_STATUS.WAITING && (this.direction === 'idle' || this.direction === dir);
    });
    if (hasMatch && this.passengers.length < ELEVATOR_CAPACITY) return true;
    if ((this.floor === FLOOR_MAX && this.direction === 'up') || (this.floor === FLOOR_MIN && this.direction === 'down')) return true;
    return false;
  },

  updateDirection() {
    const hasPassengers = this.passengers.length > 0;
    const hasWaiting = [...this.waitingMap.values()].some((list) => list.some((p) => p.status === PASSENGER_STATUS.WAITING));
    if (!hasPassengers && !hasWaiting) {
      this.direction = 'idle';
      this.status = ELEVATOR_STATUS.IDLE;
      return;
    }

    const check = (compare, direction) => {
      const targets = [...this.targetFloors].some((f) => compare(f, this.floor));
      const waiting = [...this.waitingMap.entries()].some(
        ([f, list]) => compare(Number(f), this.floor) && list.some((p) => p.status === PASSENGER_STATUS.WAITING)
      );
      if (targets || waiting) {
        this.direction = direction;
        this.status = ELEVATOR_STATUS.MOVING;
        return true;
      }
      return false;
    };

    if (this.direction === 'up') {
      if (!check((f, cur) => f > cur, 'up')) {
        this.direction = 'down';
        this.status = ELEVATOR_STATUS.MOVING;
      }
    } else if (this.direction === 'down') {
      if (!check((f, cur) => f < cur, 'down')) {
        this.direction = 'up';
        this.status = ELEVATOR_STATUS.MOVING;
      }
    } else {
      const current = this.floor;
      const nearest = [...this.waitingMap.entries()]
        .filter(([_, list]) => list.some((p) => p.status === PASSENGER_STATUS.WAITING))
        .reduce((prev, [floor]) => {
          if (prev === null) return Number(floor);
          return Math.abs(Number(floor) - current) < Math.abs(prev - current) ? Number(floor) : prev;
        }, null);

      if (nearest !== null) {
        this.direction = nearest > current ? 'up' : 'down';
        this.status = ELEVATOR_STATUS.MOVING;
      }
    }
  },

  load(waitingList) {
    const remaining = [];
    let boarded = 0;
    const canBoard = ELEVATOR_CAPACITY - this.passengers.length;

    for (const person of waitingList) {
      if (boarded >= canBoard) {
        remaining.push(person);
        continue;
      }
      person.status = PASSENGER_STATUS.IN_ELEVATOR;
      this.passengers.push(person);
      this.targetFloors.add(person.to);
      boarded++;
    }

    this.updateDirection();
    return remaining;
  },

  unload() {
    const leaving = this.passengers.filter((p) => p.to === this.floor);
    this.passengers = this.passengers.filter((p) => p.to !== this.floor);
    if (!this.passengers.some((p) => p.to === this.floor)) {
      this.targetFloors.delete(this.floor);
    }
    leaving.forEach((p) => (p.status = PASSENGER_STATUS.DONE));
    return leaving;
  },
});

const createBuilding = () => {
  const waitingMap = new Map();
  for (let i = FLOOR_MIN; i <= FLOOR_MAX; i++) waitingMap.set(i, []);

  const elevators = [createElevator(1, waitingMap), createElevator(2, waitingMap)];
  const people = [];
  const logs = [];
  let time = 0;
  let generated = 0;

  const step = () => {
    time++;
    if (generated < MAX_PASSENGERS) {
      const from = Math.floor(Math.random() * FLOOR_MAX) + 1;
      let to;
      do {
        to = Math.floor(Math.random() * FLOOR_MAX) + 1;
      } while (to === from);
      const person = {
        id: generated + 1,
        from,
        to,
        status: PASSENGER_STATUS.WAITING,
        startTime: time,
        waitTime: 0,
      };
      generated++;
      people.push(person);
      waitingMap.get(from).push(person);
      logs.push({ time, message: `👤 乘客#${person.id} 從 ${from} 樓要到 ${to} 樓` });
    }

    people.forEach((p) => {
      if (p.status === PASSENGER_STATUS.WAITING) p.waitTime++;
    });

    elevators.forEach((elevator) => {
      if (elevator.move()) {
        logs.push({ time, message: `🛗 電梯#${elevator.id} 到達 ${elevator.floor} 樓` });
      }

      if (elevator.canStop()) {
        const waitingList = (waitingMap.get(elevator.floor) || []).filter(
          (p) => p.status === PASSENGER_STATUS.WAITING
        );

        const leaving = elevator.unload();
        if (leaving.length) {
          leaving.forEach((p) =>
            logs.push({
              time,
              message: `✅ 乘客#${p.id} 在 ${elevator.floor} 樓下車（等待 ${p.waitTime} 秒）`,
            })
          );
          elevator.status = ELEVATOR_STATUS.LOADING;
          elevator.statusTimer = 0;
        }

        if (waitingList.length > 0) {
          const newWaiting = elevator.load(waitingList);
          const boarded = waitingList.length - newWaiting.length;
          if (boarded > 0) {
            logs.push({ time, message: `🚪 電梯#${elevator.id} 在 ${elevator.floor} 樓接載 ${boarded} 人` });
            elevator.status = ELEVATOR_STATUS.LOADING;
            elevator.statusTimer = 0;
          }
          waitingMap.set(elevator.floor, newWaiting);
        }
      }

      elevator.updateDirection();
    });

    const stats = {
      total: MAX_PASSENGERS,
      generated,
      waiting: people.filter((p) => p.status === PASSENGER_STATUS.WAITING).length,
      inElevator: people.filter((p) => p.status === PASSENGER_STATUS.IN_ELEVATOR).length,
      done: people.filter((p) => p.status === PASSENGER_STATUS.DONE).length,
    };

    const isComplete =
      generated >= MAX_PASSENGERS &&
      stats.waiting === 0 &&
      stats.inElevator === 0 &&
      stats.done === MAX_PASSENGERS;

    if (isComplete) {
      logs.push({ time, message: `🎉 所有乘客已運送完成，總耗時 ${time} 秒` });
    }

    return { logs, elevators, waitingMap, stats, isComplete, time };
  };

  return { step };
};

export default function ElevatorPage() {
  const [logs, setLogs] = useState([]);
  const [floors, setFloors] = useState([]);
  const [stats, setStats] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const buildingRef = useRef(null);

  useEffect(() => {
    buildingRef.current = createBuilding();
    const interval = setInterval(() => {
      const result = buildingRef.current.step();
      setLogs([...result.logs]);
      setStats(result.stats);
      setIsComplete(result.isComplete);

      const tempFloors = [];
      for (let i = FLOOR_MAX; i >= FLOOR_MIN; i--) {
        tempFloors.push({
          floor: i,
          elevators: result.elevators.filter((e) => e.floor === i),
          waitingCount: (result.waitingMap.get(i) || []).length,
        });
      }
      setFloors(tempFloors);

      if (result.isComplete) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main style={{ padding: 24, background: '#111', color: 'white', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>🛗 電梯模擬系統</h1>
      {stats && (
        <div style={{ background: '#222', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <div>總乘客: {stats.total}</div>
          <div>等待中: {stats.waiting}</div>
          <div>電梯中: {stats.inElevator}</div>
          <div>已完成: {stats.done}</div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ width: 300 }}>
          {floors.map((f) => (
            <div key={f.floor} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ width: 40, textAlign: 'right' }}>{f.floor}F</div>
              <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                {f.elevators.map((e) => (
                  <div
                    key={e.id}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      textAlign: 'center',
                      background:
                        e.status === ELEVATOR_STATUS.MOVING
                          ? 'blue'
                          : e.status === ELEVATOR_STATUS.LOADING
                          ? 'green'
                          : 'gray',
                    }}
                  >
                    🚪{e.id}
                  </div>
                ))}
              </div>
              <div style={{ width: 80, textAlign: 'left', fontSize: 12, color: '#aaa' }}>
                等候: {f.waitingCount}
              </div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, maxHeight: 400, overflowY: 'auto', background: '#222', padding: 12, borderRadius: 8 }}>
          <ul style={{ fontSize: 12 }}>
            {logs.map((log, idx) => (
              <li key={idx}>[第 {log.time} 秒] {log.message}</li>
            ))}
          </ul>
        </div>
      </div>
      {isComplete && <div style={{ marginTop: 20, color: '#4ade80', fontWeight: 'bold' }}>模擬結束！</div>}
    </main>
  );
}
