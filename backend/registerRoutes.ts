import type { RegisterRoutesDeps } from '../types/backend';
import { registerAuthRoutes } from './routes/authRoutes';
import { registerStoreRoutes } from './routes/storeRoutes';
import { registerOrderRoutes } from './routes/orderRoutes';
import { registerChatRoutes } from './routes/chatRoutes';

function registerRoutes(deps: RegisterRoutesDeps) {
  registerAuthRoutes(deps);
  registerStoreRoutes(deps);
  registerOrderRoutes(deps);
  registerChatRoutes(deps);
}

export { registerRoutes };

