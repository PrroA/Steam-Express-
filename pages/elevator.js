import { useEffect, useRef, useState } from 'react';

const FLOOR_MIN = 1;
const FLOOR_MAX = 10;
const MAX_PASSENGERS = 40;
const ELEVATOR_CAPACITY = 5;
const MOVE_TIME = 1; 
const STOP_TIME = 1;

// 電梯狀態
const ELEVATOR_STATUS = {
  MOVING: 'moving',
  LOADING: 'loading',
  IDLE: 'idle',
};

// 乘客狀態
const PASSENGER_STATUS = {
  WAITING: 'waiting', // 等待搭乘
  IN_ELEVATOR: 'inElevator', // 在電梯內
  DONE: 'done', // 已完成搭乘
};

// 電梯
const createElevator = (id, waitingMap) => {
  return {
    id,
    floor: 1,
    direction: 'idle',
    status: ELEVATOR_STATUS.IDLE,
    statusTimer: 0,
    passengers: [],
    targetFloors: new Set(),
    waitingMap,

    canStop() {
      if (this.status === ELEVATOR_STATUS.IDLE) {
        return true;
      }

      if (this.status === ELEVATOR_STATUS.LOADING && this.statusTimer >= STOP_TIME) {
        return true;
      }

      // 如果電梯移動到目標樓層且超過移動時間，可以停
      if (
        this.status === ELEVATOR_STATUS.MOVING &&
        this.statusTimer >= MOVE_TIME &&
        this.shouldStopAtFloor()
      ) {
        return true;
      }

      return false;
    },

    move() {
      if (this.status === ELEVATOR_STATUS.MOVING) {
        if (this.statusTimer >= MOVE_TIME) {
          if (this.direction === 'up') this.floor++;
          else if (this.direction === 'down') this.floor--;

          this.statusTimer = 0;

          // 檢查是否需要在當前樓層停靠
          if (this.shouldStopAtFloor()) {
            this.status = ELEVATOR_STATUS.LOADING;
          }
          return true;
        }
        this.statusTimer++;
      }
      return false;
    },

    shouldStopAtFloor() {
      if (this.targetFloors.has(this.floor)) return true;
      const waitingPassengers = this.waitingMap.get(this.floor) || [];
      const hasMatchingPassengers = waitingPassengers.some((p) => {
        const personDirection = p.to > this.floor ? 'up' : 'down';
        return (
          p.status === PASSENGER_STATUS.WAITING &&
          (this.direction === 'idle' || this.direction === personDirection)
        );
      });
      if (hasMatchingPassengers && this.passengers.length < ELEVATOR_CAPACITY) {
        return true;
      }
      if (
        (this.floor === FLOOR_MAX && this.direction === 'up') ||
        (this.floor === FLOOR_MIN && this.direction === 'down')
      ) {
        return true;
      }

      return false;
    },

updateDirection() {
  const hasPassengers = this.passengers.length > 0;
  const hasWaiting =
    this.waitingMap &&
    Array.from(this.waitingMap.values()).some((list) =>
      list.some((p) => p.status === PASSENGER_STATUS.WAITING)
    );

  if (!hasPassengers && !hasWaiting) {
    this.direction = 'idle';
    this.status = ELEVATOR_STATUS.IDLE;
    return;
  }

  if (this.direction === 'up') {
    const hasUpperFloorTargets = Array.from(this.targetFloors).some(
      (floor) => floor > this.floor
    );
    const hasUpperFloorWaiting = Array.from(this.waitingMap.entries()).some(
      ([floor, passengers]) =>
        floor > this.floor && passengers.some((p) => p.status === PASSENGER_STATUS.WAITING)
    );

    if (hasUpperFloorTargets || hasUpperFloorWaiting) {
      this.status = ELEVATOR_STATUS.MOVING;
    } else {
      this.direction = 'down';
      this.status = ELEVATOR_STATUS.MOVING;
    }
  } else if (this.direction === 'down') {
    const hasLowerFloorTargets = Array.from(this.targetFloors).some(
      (floor) => floor < this.floor
    );
    const hasLowerFloorWaiting = Array.from(this.waitingMap.entries()).some(
      ([floor, passengers]) =>
        floor < this.floor && passengers.some((p) => p.status === PASSENGER_STATUS.WAITING)
    );

    if (hasLowerFloorTargets || hasLowerFloorWaiting) {
      this.status = ELEVATOR_STATUS.MOVING;
    } else {
      this.direction = 'up';
      this.status = ELEVATOR_STATUS.MOVING; 
    }
  } else {
    const currentFloor = this.floor;
    const nearestWaiting = Array.from(this.waitingMap.entries())
      .filter(([_, passengers]) =>
        passengers.some((p) => p.status === PASSENGER_STATUS.WAITING)
      )
      .reduce((nearest, [floor]) => {
        if (nearest === null) return floor;
        const currentDiff = Math.abs(currentFloor - nearest);
        const newDiff = Math.abs(currentFloor - floor);
        return newDiff < currentDiff ? floor : nearest;
      }, null);

    if (nearestWaiting !== null) {
      this.direction = nearestWaiting > currentFloor ? 'up' : 'down';
      this.status = ELEVATOR_STATUS.MOVING; 
    }
  }
},


    load(waitingList) {
      if (this.passengers.length >= ELEVATOR_CAPACITY) return waitingList;

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

  // 只有當所有該樓層乘客下完，才移除目標樓層
  const stillGoingToThisFloor = this.passengers.some((p) => p.to === this.floor);
  if (!stillGoingToThisFloor) {
    this.targetFloors.delete(this.floor);
  }

  leaving.forEach((p) => {
    p.status = PASSENGER_STATUS.DONE;
  });

  return leaving;
}

  };
};

// 建築物管理
const createBuilding = () => {
  // 先建立 waitingMap
  const waitingMap = new Map();
  for (let i = FLOOR_MIN; i <= FLOOR_MAX; i++) {
    waitingMap.set(i, []);
  }

  // 建立電梯時傳入 waitingMap
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
      logs.push({ time, message: `👤 新乘客#${person.id} 在 ${from} 樓等待前往 ${to} 樓` });
    }

    // 更新等待時間（只更新還在等待的乘客）
    people.forEach((person) => {
      if (person.status === PASSENGER_STATUS.WAITING) {
        person.waitTime++;
      }
    });

    // 電梯運作
    elevators.forEach((elevator) => {
      if (elevator.move()) {
        logs.push({
          time,
          message: `🛗 電梯#${elevator.id} 移動到 ${elevator.floor} 樓 [載客:${elevator.passengers.length}人]`,
        });
      }

      if (elevator.canStop()) {
        // 只取還在等待的乘客
        const waitingList = (waitingMap.get(elevator.floor) || []).filter(
          (p) => p.status === PASSENGER_STATUS.WAITING
        );

        // 處理停靠客人
        const leaving = elevator.unload();
        if (leaving.length > 0) {
          leaving.forEach((p) => {
            p.endTime = time;
            logs.push({
              time,
              message: `✅ 乘客#${p.id} 在 ${elevator.floor} 樓抵達目的地 (等待時間: ${p.waitTime}秒)`,
            });
          });
          elevator.status = ELEVATOR_STATUS.LOADING;
          elevator.statusTimer = 0;
        }

        // 處理搭乘
        if (waitingList.length > 0) {
          const before = waitingList.length;
          const newWaiting = elevator.load(waitingList);
          const boarded = before - newWaiting.length;
          if (boarded > 0) {
            logs.push({
              time,
              message: `🚪 電梯#${elevator.id} 在 ${elevator.floor} 樓接載 ${boarded} 人`,
            });
            elevator.status = ELEVATOR_STATUS.LOADING;
            elevator.statusTimer = 0;
          }
          waitingMap.set(elevator.floor, newWaiting);
        }
      }

      elevator.updateDirection();
    });

    // 統計資料
    const stats = {
      total: MAX_PASSENGERS,
      generated: generated,
      waiting: people.filter((p) => p.status === PASSENGER_STATUS.WAITING).length,
      inElevator: people.filter((p) => p.status === PASSENGER_STATUS.IN_ELEVATOR).length,
      done: people.filter((p) => p.status === PASSENGER_STATUS.DONE).length,
    };

    // 檢查是否所有人都完成搭乘
    const isComplete =
      generated >= MAX_PASSENGERS &&
      stats.waiting === 0 &&
      stats.inElevator === 0 &&
      stats.done === MAX_PASSENGERS;

    if (isComplete) {
      logs.push({ time, message: `🎉 模擬完成！總共耗時 ${time} 秒，已運送 ${stats.done} 人` });
    }

    return { logs, elevators, waitingMap, stats, isComplete, time };
  };

  return { step };
};

// 主要元件
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
      setLogs(result.logs);
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

      if (result.isComplete) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <main className="p-6 bg-gray-900 min-h-screen flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4 text-white">🛗 電梯模擬系統</h1>

        {/* 統計資訊 */}
        {stats && (
          <div className="mb-4 text-white">
            <div className="bg-gray-800 p-4 rounded-lg shadow-md flex gap-4">
              <div>總乘客: {stats.total}/40</div>
              <div>等待中: {stats.waiting}</div>
              <div>電梯中: {stats.inElevator}</div>
              <div>已完成: {stats.done}</div>
            </div>
          </div>
        )}

        <div className="flex gap-8">
          <div className="bg-gray-800 p-4 rounded-md shadow-md">
            {floors.map((f) => (
              <div
                key={f.floor}
                className="flex items-center text-white space-x-4 py-1 border-b border-gray-700"
              >
                <div className="w-10 font-bold text-right">{f.floor}F</div>
                <div className="flex-1 h-6 relative">
                  <div className="absolute inset-0 flex gap-2">
                    {f.elevators.map((e) => (
                      <div
                        key={e.id}
                        className={`w-6 h-6 rounded text-xs text-center text-white
                          ${
                            e.status === ELEVATOR_STATUS.MOVING
                              ? 'animate-pulse bg-blue-500'
                              : e.status === ELEVATOR_STATUS.LOADING
                                ? 'bg-green-500'
                                : 'bg-gray-500'
                          }`}
                      >
                        🛗{e.id}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-gray-300">等候: {f.waitingCount}</div>
              </div>
            ))}
          </div>

          {/* 運作日誌 */}
          <div className="w-[400px] max-h-[600px] overflow-y-auto bg-gray-800 p-4 rounded-lg shadow-md text-white text-sm font-mono">
            <ul>
              {logs.map((log, index) => (
                <li key={index} className="py-0.5">
                  [第 {log.time} 秒] {log.message}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 完成提示 */}
        {isComplete && (
          <div className="mt-6 text-center text-green-400 font-bold text-lg">✅ 完成！</div>
        )}
      </main>
    </>
  );
}
