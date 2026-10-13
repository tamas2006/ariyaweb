/**
 * ariya.ex3 — Persistent Storage & Session Engine
 * IndexedDB for large media files (videos/images) + LocalStorage & Cookies for settings/session
 */

const DB_NAME = 'AriyaEx3Database';
const DB_VERSION = 2;
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
  },
  {
    id: 'post-img-01',
    type: 'image',
    title: 'The Mathurā & Gandhāra Epistemology',
    caption: 'Classical representation of the Buddha Shakyamuni. Form as emptiness, emptiness as form. The synthesis of Indian contemplative thought and Hellenistic sculptural aesthetics that defined the northern trade routes.',
    category: 'Visual Dhamma',
    src: 'assets/images/gandhara-mural.jpg',
    isHero: false,
    createdAt: 1712200007000
  },
  {
    id: 'post-img-02',
    type: 'image',
    title: 'Madhyamaka & The Void',
    caption: '“All things are empty of intrinsic nature.” Nāgārjuna’s dialectic illustrated through sky, stone, and silence. Neither being nor non-being, but dependent origination.',
    category: 'Philosophy',
    src: 'assets/images/gandhara-sky.jpg',
    isHero: false,
    createdAt: 1712200008000
  },
  {
    id: 'post-img-03',
    type: 'image',
    title: 'Deekshabhoomi 1956: The Rational Awakening',
    caption: 'The historic return to the Dhamma led by Babasaheb Dr. B. R. Ambedkar at Nagpur. An epochal turning point restoring human dignity, equality, and rational morality to millions.',
    category: 'Ambedkarite',
    src: 'assets/images/ambedkar-deekshabhoomi.jpg',
    isHero: false,
    createdAt: 1712200009000
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
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_MEDIA, 'readonly');
        const store = tx.objectStore(STORE_MEDIA);
        const req = store.getAll();
        req.onsuccess = async () => {
          let posts = req.result || [];
          if (posts.length === 0) {
            // Seed all defaults if empty
            await this.seedDefaults();
            const seeded = await this.getAllPosts();
            resolve(seeded);
            return;
          }

          // Ensure default image posts exist if only videos were present
          const hasImagePost = posts.some(p => p.type === 'image');
          if (!hasImagePost) {
            await this.seedDefaultImages();
            const updated = await this.getAllPosts();
            resolve(updated);
            return;
          }

          resolve(posts);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Falling back to default posts:', e);
      return DEFAULT_POSTS;
    }
  }

  static async seedDefaultImages() {
    try {
      const db = await this.open();
      const tx = db.transaction(STORE_MEDIA, 'readwrite');
      const store = tx.objectStore(STORE_MEDIA);
      const imageDefaults = DEFAULT_POSTS.filter(p => p.type === 'image');
      for (const post of imageDefaults) {
        store.put(post);
      }
      return new Promise((resolve) => {
        tx.oncomplete = () => resolve();
      });
    } catch (e) {}
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
      req.onsuccess = () => {
        this.notifySync();
        resolve(post);
      };
      req.onerror = () => reject(req.error);
    });
  }

  static async deletePost(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MEDIA, 'readwrite');
      const store = tx.objectStore(STORE_MEDIA);
      const req = store.delete(id);
      req.onsuccess = () => {
        this.notifySync();
        resolve(true);
      };
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
      tx.oncomplete = () => {
        this.notifySync();
        resolve();
      };
    });
  }

  static async getHeroVideo() {
    const posts = await this.getAllPosts();
    return posts.find(p => p.isHero) || posts.find(p => p.type === 'video') || DEFAULT_POSTS[0];
  }

  static getMediaUrl(post) {
    if (!post) return '';
    // 1. Direct Base64 string or relative path
    if (post.src && typeof post.src === 'string' && post.src.trim().length > 0) {
      return post.src;
    }
    // 2. Blob or File object
    if (post.blob) {
      if (post.blob instanceof Blob || (typeof post.blob === 'object' && post.blob.size)) {
        try {
          return URL.createObjectURL(post.blob);
        } catch (e) {
          console.warn('Could not create ObjectURL from blob:', e);
        }
      }
      if (typeof post.blob === 'string' && post.blob.length > 0) {
        return post.blob;
      }
    }
    if (post.src && (post.src instanceof Blob || (typeof post.src === 'object' && post.src.size))) {
      try {
        return URL.createObjectURL(post.src);
      } catch (e) {}
    }
    return '';
  }

  static async getBlogPosts() {
    const posts = await this.getAllPosts();
    const blogPosts = posts.filter(p => p.type === 'image' || p.isBlog);
    blogPosts.sort((a, b) => {
      const aIsCustom = a.id && a.id.startsWith('post-') && !a.id.startsWith('post-img-');
      const bIsCustom = b.id && b.id.startsWith('post-') && !b.id.startsWith('post-img-');
      if (aIsCustom && !bIsCustom) return -1;
      if (!aIsCustom && bIsCustom) return 1;
      if (aIsCustom && bIsCustom) return (b.createdAt || 0) - (a.createdAt || 0);
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
    return blogPosts;
  }

  static notifySync() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('ariya_sync_channel');
        channel.postMessage({ type: 'DATA_UPDATED', timestamp: Date.now() });
      }
    } catch (e) {}
    try {
      localStorage.setItem('ariya_last_sync', Date.now().toString());
    } catch (e) {}
  }
}

// Global Export
window.CookieManager = CookieManager;
window.AriyaDB = AriyaDB;
