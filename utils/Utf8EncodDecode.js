class Utf8EncodeDecode {
  // Method to encode a string to UTF-8
  static encodeToUtf8(input) {
    try {
      // Convert string to a Buffer using UTF-8 encoding
      const utf8Bytes = Buffer.from(input, "utf-8");
      // Encode Buffer to Base64 string
      return utf8Bytes.toString("base64");
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  // Method to decode a UTF-8 encoded string
  static decodeFromUtf8(encodedString) {
    try {
      // Decode Base64 string back to Buffer
      const decodedBytes = Buffer.from(encodedString, "base64");
      // Convert Buffer back to a string using UTF-8 encoding
      return decodedBytes.toString("utf-8");
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}

module.exports = Utf8EncodeDecode;
