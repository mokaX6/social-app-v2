// Escapes special characters so user input cannot act as a regex pattern
module.exports = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');