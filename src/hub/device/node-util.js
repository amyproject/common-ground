export const promisify = fn => (...args) => new Promise((resolve, reject) => fn(...args, (error, value) => error ? reject(error) : resolve(value)))
