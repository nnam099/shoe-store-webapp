import 'dotenv/config';
import app from './app.js';
import { startOrderAutoCompletionWorker } from './services/order-auto-completion.service.js';
import { startEmailOutboxWorker } from './services/email-outbox-worker.service.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  startOrderAutoCompletionWorker();
  startEmailOutboxWorker();
});
