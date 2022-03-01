import expect from "expect.js";
import sinon from "sinon";
import Task from "@zingle/task";

describe("task", () => {
  let task, runs;

  beforeEach(() => {
    runs = 0;
    task = Task(async function() {
      await new Promise(go => setTimeout(go, 0));
      runs++;
    }, {interval: 10});
  });

  describe("(task, [interval])", () => {
    it("should initialize status flags", () => {
      expect(task.started).to.be(false);
      expect(task.running).to.be(false);
      expect(task.draining).to.be(false);
    });
  });

  describe(".start()", () => {
    it("should run task in loop", async () => {
      return new Promise((resolve, reject) => {
        task = Task(resolveOnThirdRun, {interval: 10});
        task.start();

        async function resolveOnThirdRun() {
          if (runs++ >= 2) {
            task.stop();
            resolve();
          }
        }
      });
    });
  });

  describe(".stop()", () => {
    it("should stop task from running", async () => {
      const runsA = runs;

      // start, then wait for task to run
      task.start();
      await new Promise(go => setTimeout(go, 10));

      // now stop, then wait for task to drain
      task.stop();
      await new Promise(go => setTimeout(go, 10));

      const runsB = runs;
      expect(runsB).to.be.greaterThan(runsA);

      // inject artificial wait, then check value again
      await new Promise(go => setTimeout(go, 10));
      const runsC = runs;
      expect(runsC).to.be(runsB);
    });
  });

  describe(".started", () => {
    it("should be true if task has been started", () => {
      expect(task.started).to.be(false);
      task.start();
      expect(task.started).to.be(true);
      task.stop();
      expect(task.started).to.be(false);
    });
  });

  describe(".running", () => {
    it("should be true if task is currently running", () => {
      let done;

      task = Task(run, {interval: 15});
      task.start();
      expect(task.running).to.be(false);

      return new Promise(resolve => {
        done = function() {
          expect(task.running).to.be(false);
          resolve();
        };
      });

      async function run() {
        expect(task.running).to.be(true);
        task.stop();
        setTimeout(done, 0);
      }
    });
  });

  describe(".draining", () => {
    it("should be true if stopped but still running", () => {
      let done;

      task = Task(run, {interval: 15});
      task.start();
      expect(task.draining).to.be(false);

      return new Promise(resolve => {
        done = function() {
          expect(task.draining).to.be(false);
          resolve();
        };
      });

      async function run() {
        expect(task.draining).to.be(false);
        task.stop();
        expect(task.draining).to.be(true);
        setTimeout(done, 25);
      }
    });
  });

  describe("Event: 'started'", () => {
    let started;

    beforeEach(() => {
      started = sinon.spy();
      task.on("started", started);
    });

    afterEach(() => {
      task.stop();
    });

    it("should fire after calling .start()", () => {
      task.start();
      expect(started.called).to.be(true);
    });

    it("should not fire if already started", () => {
      task.start();
      task.start();
      expect(started.calledOnce).to.be(true);
    });
  });

  describe("Event: 'stopped'", () => {
    let stopped;

    beforeEach(() => {
      stopped = sinon.spy();
      task.on("stopped", stopped);
    });

    afterEach(() => {
      task.stop();
    });

    it("should fire after calling .stop()", () => {
      task.start();
      task.stop();
      expect(stopped.called).to.be(true);
    });

    it("should not fire if not started", () => {
      task.stop();
      expect(stopped.called).to.be(false);
      task.start();
      task.stop();
      task.stop();
      expect(stopped.calledOnce).to.be(true);
    });
  });

  describe("Event: 'running'", () => {
    let running;

    beforeEach(() => {
      running = sinon.spy();
      task.on("running", running);
    });

    afterEach(() => {
      task.stop();
    });

    it("should fire when task starts running", async () => {
      task.start();
      await new Promise(go => setTimeout(go, 30));
      expect(running.called).to.be(true);
      expect(running.callCount).to.be.greaterThan(1);
      expect(running.callCount).to.be(runs);
    });
  });

  describe("Event: 'completed'", () => {
    let running, completed;

    beforeEach(() => {
      running = sinon.spy();
      completed = sinon.spy();
      task.on("running", running);
      task.on("completed", completed);
    });

    afterEach(() => {
      task.stop();
    });

    it("should fire after task completes", async () => {
      task.start();
      await new Promise(go => setTimeout(go, 30));
      expect(completed.called).to.be(true);
      expect(completed.callCount).to.be.greaterThan(1);
      expect(completed.callCount).to.be(running.callCount);
    });
  });

  describe("Event: 'draining'", () => {
    let draining;

    beforeEach(() => {
      draining = sinon.spy();
      task.on("draining", draining);
    });

    afterEach(() => {
      task.stop();
    });

    it("should fire when stopped while running", async () => {
      task.on("running", () => task.stop());
      task.start();
      await new Promise(go => setTimeout(go, 10));
      expect(draining.calledOnce).to.be(true);
    });
  });

  describe("Event: 'drained'", () => {
    let drained;

    beforeEach(() => {
      drained = sinon.spy();
      task.on("drained", drained);
    });

    afterEach(() => {
      task.stop();
    });

    it("should fire after finishing last run", async () => {
      task.on("running", () => task.stop());
      task.start();
      await new Promise(go => setTimeout(go, 10));
      expect(drained.calledOnce).to.be(true);
    });
  });
});
