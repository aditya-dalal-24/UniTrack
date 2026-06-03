const prep = `(?:\\b(?:by|on|due|for|in)\\s+)?`;
const regex = new RegExp(`${prep}(tomorrow|tmrw)\\b`, 'i');
const match = "finish os assignment by tomorrow".match(regex);
console.log(match);
