const EventEmitter = require("events");

/**
 * Topic — a named pub/sub channel.
 *
 * Each topic is an independent EventEmitter with its own subscribers.
 * Topics are created lazily via PubSubManager.topic("name").
 *
 * Usage:
 *   const topic = pubsub.topic("crm:outbound-email");
 *   topic.publish({ to: "user@example.com", subject: "Hello" });
 *   topic.subscribe((payload) => { ... });
 */
class Topic extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.setMaxListeners(20);
  }

  /**
   * Publish a message to this topic (fire-and-forget, non-blocking).
   * @param {Object} payload
   */
  publish(payload = {}) {
    setImmediate(() => {
      try {
        this.emit("message", payload);
      } catch (err) {
        console.error(`[PubSub] Topic "${this.name}" emit error:`, err);
      }
    });
  }

  /**
   * Subscribe to messages on this topic.
   * Handler is wrapped with error handling — a failing subscriber never crashes the process.
   *
   * @param {Function} handler - async or sync function receiving the payload
   * @returns {Function} unsubscribe — call to remove this listener
   */
  subscribe(handler) {
    const safeHandler = async (payload) => {
      try {
        await handler(payload);
      } catch (err) {
        console.error(
          `[PubSub] Subscriber error on topic "${this.name}":`,
          err.message || err,
        );
      }
    };

    this.on("message", safeHandler);
    return () => this.off("message", safeHandler);
  }

  /**
   * Subscribe once — handler auto-removed after first message.
   * @param {Function} handler
   */
  subscribeOnce(handler) {
    const safeHandler = async (payload) => {
      try {
        await handler(payload);
      } catch (err) {
        console.error(
          `[PubSub] SubscribeOnce error on topic "${this.name}":`,
          err.message || err,
        );
      }
    };

    this.once("message", safeHandler);
  }
}

module.exports = Topic;
