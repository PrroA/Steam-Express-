import bcrypt from 'bcrypt';
import type { CartItem, Game, Order, ResetTokenEntry, Review, User } from '../types/backend';

export const users: User[] = [
  {
    id: 1,
    username: 'admin',
    password: bcrypt.hashSync('admin', 10),
    role: 'admin',
  },
];

export const messages: Array<{ user: string; text: string; timestamp: string }> = [];
export const reviews: Record<string, Review[]> = {};
export const carts: Record<number, CartItem[]> = {};
export const orders: Record<number, Order[]> = {};
export const wishlists: Record<number, number[]> = {};
export const resetTokens: Record<string, ResetTokenEntry> = {};
export const games: Game[] = [
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

export default {
  users,
  messages,
  reviews,
  carts,
  orders,
  wishlists,
  resetTokens,
  games,
};
