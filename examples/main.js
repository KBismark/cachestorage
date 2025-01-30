// import CacheLocalStorage from "../dist/index.js"; // For local testing
// const CacheLocalStorage = window.exports.default;

console.log(exports);

// Initialize schema for validation
const userSchema = {
  name: {
    type: "string",
    required: true,
    validate: (value) => value.length > 0,
  },
  age: {
    type: "number",
    required: true,
    validate: (value) => value >= 0 && value <= 150,
  },
  email: {
    type: "string",
    required: true,
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  },
};

// Initialize storage with options
const storage = new CacheLocalStorage({
  maxSize: 100 * 1024 * 1024, // 100MB
  namespace: "my-app",
  cacheDuration: 86400, // 1 day
  compression: { enabled: false }, // Set compression configs - optional
  encryptionKey: "0123456789abcdef0123456789abcdef", // 32 or 64 bytes key for encryption - optional
});


// Store user data
async function storeUser(user) {
  const result = await storage.setItem("user", user, userSchema);
  if (result.success) {
    console.log("User stored:", result.data);
  } else {
    console.error("Storage failed:", result.error);
  }
}

// Retrieve user data
async function getUser() {
  const result = await storage.getItem("user");
  return result.success ? result.data || null : null;
}

// Update user age
async function updateUserAge(age) {
  const result = await storage.updateItem("user", { age }, userSchema);
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
    name: "John Doe",
    age: 30,
    email: "john@example.com",
  };

  // await storeUser(user);

  const storedUser = await getUser();
  if (storedUser) {
    console.log("Retrieved user: ", storedUser);
  }else{
    console.log("No user found");
  }

//   await updateUserAge(31);
//   await checkStorage();
}

// Run the example
example();
