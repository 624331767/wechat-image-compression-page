// taskQueue.js 异步任务
const EventEmitter = require('events');

class TaskQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.running = false;
    this.results = new Map(); // taskId => { status, result, error }
  }

  addTask(taskId, taskFn) {
    this.results.set(taskId, { status: 'pending' });
    this.queue.push({ taskId, taskFn });
    this.runNext();
  }

  async runNext() {
    if (this.running) return;
    const next = this.queue.shift();
    if (!next) return;
    this.running = true;
    const { taskId, taskFn } = next;
    this.results.set(taskId, { status: 'running' });
    try {
      const result = await taskFn();
      this.results.set(taskId, { status: 'done', result });
    } catch (error) {
      this.results.set(taskId, { status: 'error', error: error.message });
    }
    this.running = false;
    this.runNext();
  }

  getStatus(taskId) {
    return this.results.get(taskId) || null;
  }
}

module.exports = new TaskQueue();