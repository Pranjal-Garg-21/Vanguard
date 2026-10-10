// Runs before every test file. Gives tests a real (in-memory) IndexedDB,
// so platform code works in tests without mocks.
import 'fake-indexeddb/auto';
