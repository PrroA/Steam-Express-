"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.games = exports.resetTokens = exports.wishlists = exports.orders = exports.carts = exports.reviews = exports.messages = exports.users = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
exports.users = [
    {
        id: 1,
        username: 'admin',
        password: bcrypt_1.default.hashSync('admin', 10),
        role: 'admin',
    },
];
exports.messages = [];
exports.reviews = {};
exports.carts = {};
exports.orders = {};
exports.wishlists = {};
exports.resetTokens = {};
exports.games = [
    {
        id: 1,
        name: 'Cyberpunk 2077',
        price: '$59.99',
        description: 'A futuristic RPG.',
        image: '/cp2077_game-thumbnail.webp',
        isActive: true,
        variants: [
            { id: 'standard', name: 'Standard', price: '$59.99', stock: 25 },
            { id: 'ultimate', name: 'Ultimate', price: '$79.99', stock: 10 },
        ],
    },
    {
        id: 2,
        name: 'Elden Ring',
        price: '$49.99',
        description: 'An open-world adventure.',
        image: '/elden.jpg',
        isActive: true,
        variants: [
            { id: 'standard', name: 'Standard', price: '$49.99', stock: 30 },
            { id: 'deluxe', name: 'Deluxe', price: '$64.99', stock: 12 },
        ],
    },
    {
        id: 3,
        name: 'Hogwarts Legacy',
        price: '$39.99',
        description: 'A magical experience.',
        image: '/Hogwarts.jpg',
        isActive: true,
        variants: [
            { id: 'standard', name: 'Standard', price: '$39.99', stock: 18 },
            { id: 'digital-deluxe', name: 'Digital Deluxe', price: '$54.99', stock: 8 },
        ],
    },
    {
        id: 4,
        name: 'The Witcher 3',
        price: '$29.99',
        description: 'A legendary RPG.',
        image: '/Witcher3.jpg',
        isActive: true,
        variants: [
            { id: 'standard', name: 'Standard', price: '$29.99', stock: 40 },
            { id: 'complete', name: 'Complete Edition', price: '$39.99', stock: 15 },
        ],
    },
    {
        id: 5,
        name: 'GTA V',
        price: '$19.99',
        description: 'A fantasy RPG.',
        image: '/GTA.png',
        isActive: true,
        variants: [
            { id: 'standard', name: 'Standard', price: '$19.99', stock: 50 },
            { id: 'premium', name: 'Premium', price: '$29.99', stock: 20 },
        ],
    },
    {
        id: 6,
        name: 'Dark Souls III',
        price: '$14.99',
        description: 'A dark fantasy RPG.',
        image: '/DarkSouls3.jpeg',
        isActive: true,
        variants: [
            { id: 'standard', name: 'Standard', price: '$14.99', stock: 22 },
            { id: 'deluxe', name: 'Deluxe', price: '$24.99', stock: 9 },
        ],
    },
    {
        id: 7,
        name: 'The Last of Us Remastered',
        price: '$19.99',
        description: 'A survival horror game.',
        image: '/TheLast.avif',
        isActive: true,
        variants: [
            { id: 'standard', name: 'Standard', price: '$19.99', stock: 16 },
            { id: 'digital-deluxe', name: 'Digital Deluxe', price: '$34.99', stock: 6 },
        ],
    },
];
exports.default = {
    users: exports.users,
    messages: exports.messages,
    reviews: exports.reviews,
    carts: exports.carts,
    orders: exports.orders,
    wishlists: exports.wishlists,
    resetTokens: exports.resetTokens,
    games: exports.games,
};
