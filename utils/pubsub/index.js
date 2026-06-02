const Topic = require("./topic");

/**
 * PubSubManager — central registry for all topics.
 *
 * Topics are created lazily: the first call to `.topic("name")` creates it,
 * subsequent calls return the same instance.
 *
 * Usage:
 *   const pubsub = require("../../utils/pubsub");
 *
 *   // Get or create a topic
 *   const emailTopic = pubsub.topic("crm:outbound-email");
 *
 *   // Publish
 *   emailTopic.publish({ to: "user@example.com", subject: "Hello" });
 *
 *   // Subscribe
 *   emailTopic.subscribe(async (payload) => { ... });
 *
 *   // List all registered topics
 *   pubsub.listTopics(); // ["crm:outbound-email", ...]
 */
class PubSubManager {
  constructor() {
    /** @type {Map<string, Topic>} */
    this.topics = new Map();
  }

  /**
   * Get or create a topic by name.
   * @param {string} name - Topic name (e.g. "crm:outbound-email")
   * @returns {Topic}
   */
  topic(name) {
    if (!this.topics.has(name)) {
      this.topics.set(name, new Topic(name));
    }
    return this.topics.get(name);
  }

  /**
   * List all registered topic names.
   * @returns {string[]}
   */
  listTopics() {
    return Array.from(this.topics.keys());
  }

  /**
   * Check if a topic exists.
   * @param {string} name
   * @returns {boolean}
   */
  hasTopic(name) {
    return this.topics.has(name);
  }
}

// Export a singleton so the same manager is shared across all modules
module.exports = new PubSubManager();
