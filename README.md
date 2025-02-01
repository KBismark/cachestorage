[![npm version](https://badge.fury.io/js/@codigex%2Fcachestorage.svg?icon=si%3Anpm&icon_color=%23f4f0f0)](https://badge.fury.io/js/@codigex%2Fcachestorage)
[![Downloads](https://img.shields.io/npm/dt/@codigex%2Fcachestorage)](https://www.npmjs.com/package/@codigex%2Fcachestorage)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# Cache Local Storage
A better way to save data locally on the browser. Think about using the browser's cache system as your local storage space in your applications.     


## Why Cache Local Storage?
If browsers can cache resources like images, javascript files, and many more, why not use it to store your application data? 
Cache Local Storage is a library that helps you store and retrieve data in the browser's cache system. It is more persistent than local storage and has a larger storage capacity. It also provides features like schema validation, compression, and encryption. No need for server interverntion to cache data, it is all done on the client side. Store, retrieve, update, and delete data with ease. 


Use Cache Local Storage to store data like user settings, user preferences, user data, and many more. It is a great way to store data that should persist even when the browser is closed. With Cache Local Storage, web pages can have state persistence across sessions.    


## Features
- **Schema Validation**: Validate data before storing it.  *Optional*
- **Compression**: Compress data before storing it. *Optional*
- **Encryption**: Encrypt data before storing it. *Optional*
- **Cache Duration**: Set a duration for how long data should be stored. Defaults to a year.
- **More Persistent**: Data is stored in the browser's cache system which is more persistent than local storage.
- **Larger Storage Capacity**:  Set a maximum size for the storage. Defaults to 50MB. 
- **Service Worker Drop-in Available**:  Serve `cls.js` at the root of your domain and Cache Local Storage works off the main thread.    
- **In-memory Cache with Service Worker**:  `cls.js` also uses an in-memory cache for faster access to data.    
 

## Installation
```bash
npm install @codigex/cachestorage
```    


## Basic usage
```js
import CacheLocalStorage from '@codigex/cachestorage';


// Initialize storage with options
const storage = new CacheLocalStorage({
  maxSize: 100 * 1024 * 1024, // 100MB - Default is 50MB
  namespace: "my-app",
  cacheDuration: 86400, // 1 day - Default is 1 year
});



// Store user data without schema validation 
async function storeUser(user) {
    const result = await storage.setItem(user.id, user);
    if (result.success) {
        console.log("User stored:", result.data);
    } else {
        console.error("Storage failed:", result.error);
    }
}


// Retrieve user data
async function getUser(userId) {
    const result = await storage.getItem(userId);
    return  result.data || null;
}


// Update fields in user data
async function updateUserName(userId, newName) {
    const result = await storage.updateItem(userId, { name: newName });
    if (result.success) {
        console.log("User updated:", result.data);
    } else {
        console.error("Update failed:", result.error);
    }
}


// Check storage stats
async function checkStorage() {
  const stats = await storage.getStats();
  console.log(`Storage usage: ${stats.percentUsed.toFixed(2)}%`);
  console.log(`Available: ${(stats.available / 1024 / 1024).toFixed(2)}MB`);
}


// Example usage
async function example() {
    const user = {
        id: "dXNlcjoxMjM0NTY3ODkw",
        name: "John Doe",
        email: "john@example.com",
    };

    await storeUser(user); // Store user data

    const storedUser = await getUser(user.id); // Retrieve user data
    if (storedUser) {
        console.log("Retrieved user: ", storedUser);
    }else{
        console.log("No user found");
    }

    await updateUserName(user.id, "James Season"); // Update user data
    await checkStorage();
}

```    




## Usage with more advanced features
```js
import CacheLocalStorage from '@codigex/cachestorage';

// Initialize storage with options
const storage = new CacheLocalStorage({
  maxSize: 100 * 1024 * 1024, // 100MB
  namespace: "my-app",
  cacheDuration: 86400, // 1 day - Default is 1 year
  compression: { enabled: true, level: 9 }, // Set compression configs - optional
  encryptionKey: "0123456789abcdef0123456789abcdef", // 32 or 64 bytes key for encryption - optional
});


// Initialize schema for validation - optional
const userSchema = {
    id: {
        type: "string",
        required: true,
        validate: (value) => value.length > 0,
    },
    name: {
        type: "string",
        required: true,
        validate: (value) => value.length > 0,
    },
    email: {
        type: "string",
        required: true,
        validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    },
};

// Store user data with schema validation 
async function storeUser(user) {
    const result = await storage.setItem(user.id, user, userSchema);
    if (result.success) {
        console.log("User stored:", result.data);
    } else {
        console.error("Storage failed:", result.error);
    }
}


// Retrieve user data
async function getUser(userId) {
    const result = await storage.getItem(userId);
    return  result.data || null;
}


// Update fields in user data
async function updateUserName(userId, newName) {
    const result = await storage.updateItem(userId, { name: newName }, userSchema);
    if (result.success) {
        console.log("User updated:", result.data);
    } else {
        console.error("Update failed:", result.error);
    }
}



async function example() {
    const user = {
        id: "dXNlcjoxMjM0NTY3ODkw",
        name: "John Doe",
        email: "john@example.com",
    };

    try {
        await storeUser(user);
    } catch (error) {
        console.error("Error storing user: ", error);
    }

    try {
        const storedUser = await getUser(user.id);
        if (storedUser) {
            console.log("Retrieved user: ", storedUser);
        }else{
            console.log("No user found");
        }
    } catch (error) {
        console.error("Error retrieving user: ", error);
    }

    try {
        await updateUserName(user.id, "James Season");
    } catch (error) {
        console.error("Error updating user: ", error);
    }
}


example();

```



## API
### CacheLocalStorage
- **constructor(options: CacheLocalStorageOptions): CacheLocalStorage** - Initialize Cache Local Storage with options.    

- **setItem(key: string, data: any, schema?: Schema): Promise<StorageResult>** - Store data in cache.    
    - **key**: string - The key to store the data with.    
    - **data**: any - The data to store.    
    - **schema**: Schema - The schema to validate the data with. *Optional*    

- **getItem(key: string): Promise<StorageResult>** - Retrieve data from cache.    
    - **key**: string - The key to retrieve the data with.    

- **updateItem(key: string, data: any, schema?: Schema): Promise<StorageResult>** - Update data in cache. Uses `setItem` internally.    
    - **key**: string - The key to update the data with.      
    - **data**: any - The data to update.    
    - **schema**: Schema - The schema to validate the data with. *Optional*    

- **removeItem(key: string): Promise<StorageResult>** - Remove data from cache.    
    - **key**: string - The key to remove the data with.    

- **clear(): Promise<StorageResult>** - Clear all data from cache.    

- **getStats(): Promise<StorageStats>** - Get storage stats.    

- **getCompressionStats(key: string): Promise<CompressionMetaData | null>** - Get compression stats.    




## Limitations
- **Storage Capacity**: Cache Local Storage is limited by the browser's cache system.     

- **Data Persistence**: Browser cache can be cleared by the user or the browser.    

- **Data Security**: Data stored in the browser cache is not secure. It is recommended not to store anything sensitive on the user browser. However, if you still do, then enable encryption.    


