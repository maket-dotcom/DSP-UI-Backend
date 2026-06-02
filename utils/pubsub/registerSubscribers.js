/**
 * Central PubSub Subscriber Registry
 *
 * All module subscribers are registered from this single file.
 * This is called once at application boot from the main index.js.
 *
 * To add a new module's subscribers:
 *   1. Create a subscribers.js in your module folder
 *   2. Import and call it below
 */

const registerAllSubscribers = () => {
  console.log("[PubSub] Registering all subscribers...");


  console.log("[PubSub] All subscribers registered.");
};

module.exports = registerAllSubscribers;
