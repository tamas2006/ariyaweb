/**
 * ariya.ex3 — Persistent Storage & Session Engine
 * IndexedDB for large media files (videos/images) + LocalStorage & Cookies for settings/session
 */

const DB_NAME = 'AriyaEx3Database';
const DB_VERSION = 1;
const STORE_MEDIA = 'media_posts';

// Cookie Utilities
const CookieManager = {
  set(name, value, days = 7) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  },
  get(name) {
    return document.cookie.split('; ').reduce((r, v) => {
      const parts = v.split('=');
      return parts[0] === encodeURIComponent(name) ? decodeURIComponent(parts[1]) : r;
    }, '');
  },
  delete(name) {
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  }
};

// Default Seed Data
const DEFAULT_POSTS = [
  {
    id: 'post-hero-default',
    type: 'video',
    title: 'Sanctuary of Mind',
    caption: 'Hero Centerpiece',
    category: 'Hero',
    src: 'assets/videos/lake.mp4',
    isHero: true,
    createdAt: 1712200000000
  },
  {
    id: 'post-01',
    type: 'video',
    title: 'Edit 01',
    caption: 'The Annihilation of Darkness',
    category: 'Ambedkarite',
    src: 'assets/videos/clip-01.mp4',
    isHero: false,
    createdAt: 1712200001000
  },
  {
    id: 'post-02',
    type: 'video',
    title: 'Edit 02',
    caption: 'Candrakīrti: Glory of the Moon',
    category: 'Madhyamaka',
    src: 'assets/videos/clip-02.mp4',
    isHero: false,
    createdAt: 1712200002000
  },
  {
    id: 'post-03',
    type: 'video',
    title: 'Edit 03',
    caption: 'Nālandā: The Epistemological Forge',
    category: 'Nalanda',
    src: 'assets/videos/clip-03.mp4',
    isHero: false,
    createdAt: 1712200003000
  },
  {
    id: 'post-04',
    type: 'video',
    title: 'Edit 04',
    caption: 'When This Is, That Is',
    category: 'Philosophy',
    src: 'assets/videos/clip-04.mp4',
    isHero: false,
    createdAt: 1712200004000
  },
  {
    id: 'post-05',
    type: 'video',
    title: 'Edit 05',
    caption: 'Skyfall: Bauddha’s Will Rise Again',
    category: 'Ambedkarite',
    src: 'assets/videos/clip-05.mp4',
    isHero: false,
    createdAt: 1712200005000
  },
  {
    id: 'post-06',
    type: 'video',
    title: 'Edit 06',
    caption: 'Dukkha & The Modern Condition',
    category: 'Philosophy',
    src: 'assets/videos/clip-06.mp4',
    isHero: false,
    createdAt: 1712200006000
  }
];

// IndexedDB Helper
class AriyaDB {
  static open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_MEDIA)) {
          const store = db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  static async getAllPosts() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MEDIA, 'readonly');
      const store = tx.objectStore(STORE_MEDIA);
      const req = store.getAll();
      req.onsuccess = async () => {
        let posts = req.result || [];
        if (posts.length === 0) {
          // Seed defaults if empty
          await this.seedDefaults();
          posts = await this.getAllPosts();
        }
        resolve(posts);
      };
      req.onerror = () => reject(req.error);
    });
  }

  static async seedDefaults() {
    const db = await this.open();
    const tx = db.transaction(STORE_MEDIA, 'readwrite');
    const store = tx.objectStore(STORE_MEDIA);
    for (const post of DEFAULT_POSTS) {
      store.put(post);
    }
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  }

  static async savePost(post) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MEDIA, 'readwrite');
      const store = tx.objectStore(STORE_MEDIA);
      const req = store.put(post);
      req.onsuccess = () => resolve(post);
      req.onerror = () => reject(req.error);
    });
  }

  static async deletePost(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MEDIA, 'readwrite');
      const store = tx.objectStore(STORE_MEDIA);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  static async setHeroVideo(id) {
    const posts = await this.getAllPosts();
    const db = await this.open();
    const tx = db.transaction(STORE_MEDIA, 'readwrite');
    const store = tx.objectStore(STORE_MEDIA);
    for (const post of posts) {
      post.isHero = (post.id === id);
      store.put(post);
    }
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  }

  static async getHeroVideo() {
    const posts = await this.getAllPosts();
    return posts.find(p => p.isHero) || posts.find(p => p.type === 'video') || DEFAULT_POSTS[0];
  }
}

// Global Export
window.CookieManager = CookieManager;
window.AriyaDB = AriyaDB;
