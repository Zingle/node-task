import {EventEmitter} from "events";

const DEFAULT_INTERVAL = 60000;

export default function task(task, {
  interval=DEFAULT_INTERVAL
}={}) {
  let started = false;
  let running = false;
  let draining = false;
  let timeout = false;

  const controller = {
    start, stop,
    get started() { return started; },
    get running() { return running; },
    get draining() { return draining; }
  };

  Object.setPrototypeOf(controller, EventEmitter.prototype);
  EventEmitter.call(controller);

  return controller;

  function start() {
    if (started) {
      return false;
    } else {
      timeout = setTimeout(run, 0);
      started = true;
      controller.emit("started");
      return true;
    }
  };

  function stop() {
    if (started) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = false;
      }

      started = false;

      if (running) {
        draining = true;
        controller.emit("draining");
      } else {
        controller.emit("stopped");
      }

      return true;
    } else {
      return false;
    }
  }

  async function run() {
    timeout = false;
    running = true;

    try {
      const promise = task();
      controller.emit("running");
      await promise;
      running = false;
      controller.emit("completed");
    } catch (err) {
      running = false;
      controller.emit("error", err);
    }

    if (draining) {
      draining = false;
      if (!started) {
        controller.emit("drained");
        controller.emit("stopped");
      }
    }

    if (started) {
      timeout = setTimeout(run, interval);
    }
  }
}
