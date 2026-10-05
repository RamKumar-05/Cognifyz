// Task 8 – Background job processing (simulated with setTimeout; use BullMQ in production)
const queue = [];
let processing = false;

function enqueue(name, payload, handler) {
  queue.push({ name, payload, handler });
  process.nextTick(run);
}

async function run() {
  if (processing) return;
  processing = true;
  while (queue.length) {
    const job = queue.shift();
    try {
      console.log(`[JOB] Processing: ${job.name}`);
      await job.handler(job.payload);
      console.log(`[JOB] Completed: ${job.name}`);
    } catch (err) {
      console.error(`[JOB] Failed: ${job.name}`, err.message);
    }
  }
  processing = false;
}

module.exports = { enqueue };