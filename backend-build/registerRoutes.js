"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const authRoutes_1 = require("./routes/authRoutes");
const storeRoutes_1 = require("./routes/storeRoutes");
const orderRoutes_1 = require("./routes/orderRoutes");
const chatRoutes_1 = require("./routes/chatRoutes");
function registerRoutes(deps) {
    (0, authRoutes_1.registerAuthRoutes)(deps);
    (0, storeRoutes_1.registerStoreRoutes)(deps);
    (0, orderRoutes_1.registerOrderRoutes)(deps);
    (0, chatRoutes_1.registerChatRoutes)(deps);
}
